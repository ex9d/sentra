import { BrowserWindow } from 'electron'
import { sessionManager, SessionManager } from './SessionManager'
import { ProcessMonitor } from './ProcessMonitor'
import { logMonitor } from './LogMonitor'
import { WatcherSession, WatcherEvent, WatcherConfig, LaunchConfig } from './types'
import { RobloxLauncherService } from '../install/LauncherService'
import { storageService } from '../system/StorageService'

/**
 * WatcherService - Main orchestrator for monitoring Roblox clients and restarting crashed ones
 */
export class WatcherService {
  private sessionManager: SessionManager
  private config: WatcherConfig
  private events: WatcherEvent[] = []
  private monitoringLoop: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null
  private restartTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.sessionManager = sessionManager
    // Load persisted watcher config from storage
    const savedConfig = storageService.getWatcherConfig()
    this.config = {
      enabled: false,
      autoRestart: savedConfig.autoRestart,
      restartDelaySeconds: 5,
      checkIntervalMs: 15000,
      logCheckIntervalMs: 2000,
      enableRAMLimiter: savedConfig.enableRAMLimiter,
      ramLimitMB: savedConfig.ramLimitMB
    }
  }

  /**
   * Initialize the WatcherService with a reference to the main window
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
    console.log('[WatcherService] Initialized')
  }

  /**
   * Start watching sessions
   */
  startWatching(): void {
    if (this.config.enabled && this.monitoringLoop) {
      console.log('[WatcherService] Already watching')
      return
    }

    this.config.enabled = true
    console.log('[WatcherService] Started watching')
    this.logEvent({
      type: 'session-started',
      sessionId: 'watcher',
      username: 'system',
      message: 'Watcher started monitoring sessions'
    })

    this.startMonitoringLoop()
  }

  /**
   * Stop watching sessions
   */
  stopWatching(): void {
    if (this.monitoringLoop) {
      clearInterval(this.monitoringLoop)
      this.monitoringLoop = null
    }

    // Cancel all pending restarts
    for (const timer of this.restartTimers.values()) {
      clearTimeout(timer)
    }
    this.restartTimers.clear()

    this.config.enabled = false
    console.log('[WatcherService] Stopped watching')
    this.logEvent({
      type: 'session-stopped',
      sessionId: 'watcher',
      username: 'system',
      message: 'Watcher stopped monitoring sessions'
    })
  }

  /**
   * Add a new session to watch
   */
  addSession(
    accountId: string,
    username: string,
    userId: string,
    pid: number,
    placeId: number,
    logFile: string,
    launchConfig?: LaunchConfig,
    jobId?: string,
    friendId?: string,
    displayName?: string,
    avatarUrl?: string
  ): WatcherSession {
    const session = this.sessionManager.createSession(
      accountId,
      username,
      userId,
      pid,
      placeId,
      logFile,
      launchConfig,
      jobId,
      friendId,
      displayName,
      avatarUrl
    )

    console.log(`[WatcherService] Session created: ${session.id} for ${username} (PID: ${pid}, Place: ${placeId})`)
    this.logEvent({
      type: 'session-started',
      sessionId: session.id,
      username,
      message: `Session started for ${username} (PID: ${pid}, Place: ${placeId})${logFile ? ` - Watching ${logFile}` : ' - Waiting for log file'}`
    })

    // Send update to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('watcher:sessions-updated', this.sessionManager.getAllSessions())
    }

    return session
  }

  /**
   * Get all sessions
   */
  getSessions(): WatcherSession[] {
    return this.sessionManager.getAllSessions()
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): WatcherSession | undefined {
    return this.sessionManager.getSessionById(sessionId)
  }

  /**
   * Stop watching a specific session
   */
  stopSession(sessionId: string): void {
    const session = this.sessionManager.getSessionById(sessionId)
    if (session) {
      // Cancel any pending restart
      const restartTimer = this.restartTimers.get(sessionId)
      if (restartTimer) {
        clearTimeout(restartTimer)
        this.restartTimers.delete(sessionId)
      }

      console.log(`[Watcher] Session stopped for ${session.username}`)
      this.sessionManager.removeSession(sessionId)
    }
  }

  /**
   * Update watcher configuration
   */
  updateConfig(config: Partial<WatcherConfig>): void {
    this.config = { ...this.config, ...config }
    // Save settings to storage
    const storageConfig: any = {}
    if (config.autoRestart !== undefined) {
      storageConfig.autoRestart = config.autoRestart
    }
    if (config.enableRAMLimiter !== undefined) {
      storageConfig.enableRAMLimiter = config.enableRAMLimiter
    }
    if (config.ramLimitMB !== undefined) {
      storageConfig.ramLimitMB = config.ramLimitMB
    }
    if (Object.keys(storageConfig).length > 0) {
      storageService.setWatcherConfig(storageConfig)
    }
    console.log('[WatcherService] Config updated:', this.config)
  }

  /**
   * Get current configuration
   */
  getConfig(): WatcherConfig {
    return { ...this.config }
  }

  /**
   * Get event log
   */
  getEventLog(): WatcherEvent[] {
    return [...this.events]
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.events = []
  }

  /**
   * Main monitoring loop
   */
  private startMonitoringLoop(): void {
    if (this.monitoringLoop) {
      clearInterval(this.monitoringLoop)
    }

    this.monitoringLoop = setInterval(() => {
      this.checkAllSessions()
    }, this.config.checkIntervalMs)
  }

  /**
   * Check all active sessions for crashes and process status
   */
  private async checkAllSessions(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const sessions = this.sessionManager.getAllSessions()
      
      if (sessions.length === 0) {
        return
      }

      for (const session of sessions) {
        // Skip sessions that are already restarting
        if (session.status === 'restarting') {
          continue
        }

        // Check RAM limiter if enabled
        if (this.config.enableRAMLimiter && this.config.ramLimitMB && this.config.ramLimitMB > 0) {
          console.log(`[Watcher] Checking RAM for ${session.username} (PID: ${session.pid}, Limit: ${this.config.ramLimitMB}MB)`)
          const needsRestart = await ProcessMonitor.checkAndLimitRAM(session.pid, this.config.ramLimitMB)
          if (needsRestart) {
            console.log(
              `[Watcher] RAM limit exceeded for ${session.username} - marking for restart`
            )
            this.logEvent({
              type: 'session-crashed',
              sessionId: session.id,
              username: session.username,
              message: `Process exceeded RAM limit (${this.config.ramLimitMB}MB) - restarting automatically`,
              details: { reason: 'RAM_LIMIT_EXCEEDED' }
            })
            await this.onSessionCrashed(session, `RAM limit exceeded (${this.config.ramLimitMB}MB)`)
            continue
          }
        }

        // Check if process is running outside grace period
        const inGracePeriod = session.lastRestartTime && Date.now() - session.lastRestartTime < 45000
        const isRunning = await ProcessMonitor.isProcessRunning(session.pid)
        
        if (inGracePeriod) {
          const remaining = Math.round((45000 - (Date.now() - session.lastRestartTime!)) / 1000)
          console.log(`[Watcher] Grace period active for ${session.username} (${remaining}s remaining)`)
        } else if (!isRunning) {
          // After grace period, if process is completely gone, mark as crashed
          console.log(`[Watcher] Process ${session.pid} for ${session.username} is not running - marking as crashed`)
          await this.onSessionCrashed(session, 'Process ended unexpectedly')
          continue
        }

        // Check log file for crash indicators
        try {
          // If we don't have a log file yet, try to find it
          if (!session.logFile) {
            console.log(`[Watcher] No log file set for ${session.username}, searching...`)
            const foundLogFile = await logMonitor.findLatestLogFile()
            if (foundLogFile) {
              console.log(`[Watcher] Found log file for ${session.username}: ${foundLogFile}`)
              this.sessionManager.updateSessionLogFile(session.id, foundLogFile)
              // Continue to next session to use updated log file in next cycle
              continue
            } else {
              console.log(`[Watcher] Still no log file found for ${session.username}`)
              continue
            }
          }

          const logSize = logMonitor.getLogFileSize(session.logFile)
          
          // Only check logs if they exist
          if (logSize === 0) {
            continue
          }

          // Check for crashes using new content or full scan fallback
          let contentToCheck = ''
          
          if (logSize > session.lastLogSize) {
            // Normal case: read new content since last check
            contentToCheck = await logMonitor.readNewLogContent(session.logFile, session.lastLogSize)
          } else if (logSize === session.lastLogSize && session.lastLogSize > 0) {
            // File hasn't grown - could be from before our tracking started
            // Do a full file scan if process is not running (potential missed crash)
            const isRunning = await ProcessMonitor.isProcessRunning(session.pid)
            if (!isRunning) {
              console.log(`[Watcher] Process closed and log size stable - doing full file scan for crash indicators`)
              contentToCheck = await logMonitor.readNewLogContent(session.logFile, 0) // Read entire file
            }
          }

          if (contentToCheck && contentToCheck.length > 0) {
            const crashResult = logMonitor.detectCrashIndicators(contentToCheck)

            if (crashResult.crashed) {
              console.log(`[Watcher] Crash detected for ${session.username}: ${crashResult.reason}`)
              this.sessionManager.updateLogSize(session.id, logSize)
              await this.onSessionCrashed(session, crashResult.reason || 'Unknown')
              continue
            }

            // Update log size if no crash detected
            this.sessionManager.updateLogSize(session.id, logSize)
          } else {
            // Still update log size for tracking
            if (logSize > session.lastLogSize) {
              this.sessionManager.updateLogSize(session.id, logSize)
            }
          }
        } catch (logError) {
          console.error(`[Watcher] Error checking logs for ${session.username}:`, logError)
        }
      }
    } catch (error) {
      console.error('[WatcherService] Error in monitoring loop:', error)
      this.logEvent({
        type: 'error',
        sessionId: 'watcher',
        username: 'system',
        message: `Error in monitoring loop: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  /**
   * Handle a crashed session
   */
  private async onSessionCrashed(session: WatcherSession, reason: string): Promise<void> {
    this.sessionManager.updateSessionStatus(session.id, 'crashed')
    this.sessionManager.updateLastCrashReason(session.id, reason)

    console.log(`[Watcher] Crash detected for ${session.username}: ${reason}`)
    this.logEvent({
      type: 'session-crashed',
      sessionId: session.id,
      username: session.username,
      message: `Crash detected for ${session.username}: ${reason}`,
      details: { reason }
    })

    // Kill the crashed process
    const killed = await ProcessMonitor.killProcess(session.pid)
    if (killed) {
      console.log(`[Watcher] Killed process ${session.pid} for ${session.username}`)
      this.logEvent({
        type: 'error',
        sessionId: session.id,
        username: session.username,
        message: `Process ${session.pid} terminated for ${session.displayName || session.username}`
      })
    }

    // Notify renderer of crash and send updated sessions
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('watcher:session-crashed', {
        sessionId: session.id,
        username: session.username,
        reason
      })
      this.mainWindow.webContents.send('watcher:sessions-updated', this.sessionManager.getAllSessions())
    }

    // Handle auto-restart if enabled
    console.log(`[Watcher] Auto-restart check: enabled=${this.config.autoRestart}, hasConfig=${!!session.launchConfig}`)
    if (this.config.autoRestart && session.launchConfig) {
      console.log(`[Watcher] Scheduling restart for ${session.username} (attempt ${session.restartAttempts + 1}/3)`)
      this.scheduleRestart(session)
    } else {
      if (!this.config.autoRestart) {
        console.log(`[Watcher] AutoRestart disabled in config`)
      }
      if (!session.launchConfig) {
        console.log(`[Watcher] No launch config available for ${session.username}`)
      }
    }
  }

  /**
   * Schedule a restart for a session with delay
   */
  private scheduleRestart(session: WatcherSession): void {
    // Check if we've exceeded max restart attempts (3)
    const maxAttempts = 3
    if (session.restartAttempts >= maxAttempts) {
      console.error(
        `[Watcher] Max restart attempts (${maxAttempts}) exceeded for ${session.username}. Giving up.`
      )
      this.logEvent({
        type: 'error',
        sessionId: session.id,
        username: session.username,
        message: `Failed to auto-restart ${session.displayName || session.username} after ${maxAttempts} attempts. Last reason: ${session.lastCrashReason || 'Unknown'}. Reason: Could not detect process start or launch failed.`
      })
      return
    }

    const delayMs = this.config.restartDelaySeconds * 1000

    console.log(
      `[Watcher] Scheduling restart for ${session.username} in ${this.config.restartDelaySeconds}s (attempt ${session.restartAttempts + 1}/${maxAttempts})`
    )
    this.logEvent({
      type: 'session-restarted',
      sessionId: session.id,
      username: session.username,
      message: `Scheduling restart for ${session.displayName || session.username} in ${this.config.restartDelaySeconds}s (attempt ${session.restartAttempts + 1}/${maxAttempts})`
    })

    // Increment attempt counter
    this.sessionManager.incrementRestartAttempts(session.id)

    // Cancel any existing restart timer for this session
    const existingTimer = this.restartTimers.get(session.id)
    if (existingTimer) {
      console.log(`[Watcher] Cancelled existing restart timer for ${session.username}`)
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(async () => {
      console.log(`[Watcher] Executing scheduled restart for ${session.username}`)
      this.restartTimers.delete(session.id)
      await this.restartSession(session)
    }, delayMs)

    this.restartTimers.set(session.id, timer)
    console.log(`[Watcher] Restart timer set for ${session.username}`)
  }

  /**
   * Restart a crashed session using the existing launcher
   */
  private async restartSession(session: WatcherSession): Promise<void> {
    try {
      if (!session.launchConfig) {
        console.log(`[Watcher] Cannot restart ${session.username} - no launch config`)
        this.logEvent({
          type: 'error',
          sessionId: session.id,
          username: session.username,
          message: `Cannot restart ${session.username} - no launch config available`
        })
        return
      }

      console.log(`[Watcher] Starting restart process for ${session.username}`)
      this.sessionManager.updateSessionStatus(session.id, 'restarting')

      const { cookie, placeId, jobId, friendId, installPath } = session.launchConfig

      console.log(`[Watcher] Launching game for ${session.username} on place ${placeId}`)

      // Ensure old process is killed if still running
      const isOldProcessStillRunning = await ProcessMonitor.isProcessRunning(session.pid)
      if (isOldProcessStillRunning) {
        console.log(`[Watcher] Old process ${session.pid} still running, killing it`)
        await ProcessMonitor.killProcess(session.pid)
      }

      // Get current processes before launching
      const pidsBefore = await ProcessMonitor.getRobloxProcessPids()
      console.log(`[Watcher] Processes before restart: ${pidsBefore.join(', ')}`)

      // Use the existing launcher service
      let launchSuccess = false
      try {
        const result = await RobloxLauncherService.launchGame(
          cookie,
          placeId,
          jobId,
          friendId as string | number | undefined,
          installPath
        )
        launchSuccess = result?.success === true
      } catch (launchError: any) {
        console.error(`[Watcher] Launch error for ${session.username}:`, launchError)
        const errorMsg = launchError?.message || 'Unknown error'
        this.logEvent({
          type: 'error',
          sessionId: session.id,
          username: session.username,
          message: `Failed to launch game: ${errorMsg}`
        })
        this.sessionManager.updateSessionStatus(session.id, 'crashed')
        // Schedule another retry
        this.scheduleRestart(session)
        return
      }

      if (!launchSuccess) {
        console.error(`[Watcher] Failed to launch game for ${session.username}`)
        this.logEvent({
          type: 'error',
          sessionId: session.id,
          username: session.username,
          message: `Failed to launch game for ${session.displayName || session.username}`
        })
        this.sessionManager.updateSessionStatus(session.id, 'crashed')
        // Schedule another retry
        this.scheduleRestart(session)
        return
      }

      console.log(`[Watcher] Game launched successfully for ${session.username}`)

      // Wait for new process to appear (up to 10 seconds)
      let newPid: number | null = null
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const pidsAfter = await ProcessMonitor.getRobloxProcessPids()
        const newPids = pidsAfter.filter((pid) => !pidsBefore.includes(pid))

        if (newPids.length > 0) {
          newPid = newPids[0]
          console.log(`[Watcher] Detected new process PID ${newPid} after restart`)
          break
        }
      }

      // Update PID if new process found, otherwise use first available process
      if (newPid) {
        console.log(`[Watcher] Updating session PID from ${session.pid} to ${newPid}`)
        this.sessionManager.updateSessionPid(session.id, newPid)
      } else {
        const pidsAfter = await ProcessMonitor.getRobloxProcessPids()
        console.log(`[Watcher] No new process detected, available processes: ${pidsAfter.join(', ')}`)
        
        // Restart failed - no new process found
        if (pidsAfter.length === 0) {
          console.error(`[Watcher] Restart failed for ${session.username} - no Roblox processes found after launch`)
          this.sessionManager.updateSessionStatus(session.id, 'crashed')
          this.logEvent({
            type: 'error',
            sessionId: session.id,
            username: session.username,
            message: `Failed to restart ${session.displayName || session.username} - no process started`
          })
          // Schedule another retry if we haven't hit max attempts
          this.scheduleRestart(session)
          return
        }

        // Use first new process if any
        const newProcess = pidsAfter.find((pid) => !pidsBefore.includes(pid))
        if (newProcess) {
          console.log(`[Watcher] Found new process PID ${newProcess}`)
          this.sessionManager.updateSessionPid(session.id, newProcess)
          newPid = newProcess
        } else if (pidsAfter.length > 0) {
          // Fall back to any available process
          console.log(`[Watcher] No new process found, using first available PID ${pidsAfter[0]}`)
          this.sessionManager.updateSessionPid(session.id, pidsAfter[0])
          newPid = pidsAfter[0]
        }
      }

      // Try to find the new log file
      let newLogFile: string | null = null
      if (newPid) {
        console.log(`[Watcher] Searching for new log file for process ${newPid}`)
        for (let i = 0; i < 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          newLogFile = await logMonitor.findLatestLogFile()
          if (newLogFile && newLogFile !== session.logFile) {
            console.log(`[Watcher] Found new log file: ${newLogFile}`)
            break
          }
        }

        if (newLogFile) {
          console.log(`[Watcher] Updating log file from ${session.logFile} to ${newLogFile}`)
          this.sessionManager.updateSessionLogFile(session.id, newLogFile)
        } else {
          console.warn(`[Watcher] Could not find new log file, keeping old one: ${session.logFile}`)
        }
      }

      this.sessionManager.incrementRestartCount(session.id)
      this.sessionManager.resetRestartAttempts(session.id)

      console.log(`[Watcher] Successfully restarted ${session.username} (Restart #${session.restartCount})`)
      this.logEvent({
        type: 'session-restarted',
        sessionId: session.id,
        username: session.username,
        message: `Successfully restarted ${session.displayName || session.username} - now running (Auto-restart #${session.restartCount})`
      })

      // Update session with new restart timestamp and status
      this.sessionManager.updateLastRestartTime(session.id, Date.now())
      this.sessionManager.updateSessionStatus(session.id, 'running')
      console.log(`[Watcher] Grace period started for ${session.username} (45s)`)

      // Notify renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send('watcher:sessions-updated', this.sessionManager.getAllSessions())
      }
    } catch (error) {
      console.error(`[Watcher] Error restarting ${session.username}:`, error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logEvent({
        type: 'error',
        sessionId: session.id,
        username: session.username,
        message: `Error restarting ${session.displayName || session.username}: ${errorMsg}`
      })

      this.sessionManager.updateSessionStatus(session.id, 'crashed')
      // Schedule another retry if we haven't hit max attempts
      this.scheduleRestart(session)
    }
  }

  /**
   * Auto-detect and register a newly launched game
   * Called after launching a game from the Watcher UI
   */
  async autoTrackLaunchedGame(
    accountId: string,
    username: string,
    userId: string,
    placeId: number,
    launchConfig?: LaunchConfig,
    displayName?: string,
    avatarUrl?: string
  ): Promise<WatcherSession | null> {
    try {
      console.log(`[WatcherService] Starting auto-track for ${username} (place ${placeId})`)

      // Get initial process list before launch
      const initialPids = await ProcessMonitor.getRobloxProcessPids()
      console.log(`[WatcherService] Initial Roblox processes: ${initialPids.join(', ')} (count: ${initialPids.length})`)

      // Try to detect a new process (up to 20 seconds)
      let newPid: number | null = null
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const currentPids = await ProcessMonitor.getRobloxProcessPids()
        const newPids = currentPids.filter((pid) => !initialPids.includes(pid))

        if (newPids.length > 0) {
          newPid = newPids[0]
          console.log(`[WatcherService] Detected new Roblox process: PID ${newPid} after ${i + 1}s`)
          break
        }

        if (i > 0 && i % 5 === 0) {
          console.log(`[WatcherService] Still waiting for process... (${i}s elapsed, current: ${currentPids.join(', ')})`)
        }
      }

      // If no new process detected, use the most recent PID (game may reuse existing process)
      if (!newPid) {
        const currentPids = await ProcessMonitor.getRobloxProcessPids()
        if (currentPids.length > 0) {
          // Use the first/most recent process if game reuses existing process
          newPid = currentPids[0]
          console.log(`[WatcherService] No new process detected, using existing PID ${newPid}. (Roblox may reuse process on macOS)`)
        } else {
          console.warn('[WatcherService] No Roblox processes found')
          return null
        }
      }

      // Wait for log file to be created (try for 10 seconds)
      console.log('[WatcherService] Waiting for log file to be created...')
      let logFile: string | null = null
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        logFile = await logMonitor.findLatestLogFile()
        if (logFile) {
          console.log(`[WatcherService] Found log file: ${logFile} after ${(i + 1) * 0.5}s`)
          break
        }
        if (i % 4 === 0 && i > 0) {
          console.log(`[WatcherService] Still searching for log file... (attempt ${i + 1}/20)`)
        }
      }

      // Register session - even without log file, will find it during monitoring
      if (logFile) {
        console.log(`[WatcherService] Registering session for ${username} with log: ${logFile}`)
      } else {
        console.log(`[WatcherService] Registering session for ${username} without log file yet - will find during monitoring`)
      }

      const session = this.addSession(
        accountId,
        username,
        userId,
        newPid,
        placeId,
        logFile || '',
        launchConfig,
        undefined,
        undefined,
        displayName,
        avatarUrl
      )

      return session
    } catch (error: any) {
      console.error('[WatcherService] Error auto-tracking launched game:', error)
      return null
    }
  }

  /**
   * Log a watcher event
   */
  private logEvent(event: Omit<WatcherEvent, 'timestamp'>): void {
    const fullEvent: WatcherEvent = {
      ...event,
      timestamp: Date.now()
    }

    this.events.push(fullEvent)

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }

    // Send to renderer in real-time
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('watcher:event', fullEvent)
    }

    console.log(`[Watcher] Event: ${event.type} - ${event.message}`)
  }

  /**
   * Clear all sessions and stop watching
   */
  clearAll(): void {
    this.stopWatching()
    this.sessionManager.clearAllSessions()
    this.clearEventLog()
  }
}

// Export singleton instance
export const watcherService = new WatcherService()
