import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron'
import { z } from 'zod'
import { watcherService } from './WatcherService'

const handle = <T extends any[]>(
  channel: string,
  schema: z.ZodType<T>,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any>
) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const parsedArgs = schema.parse(args)
      return await handler(event, ...parsedArgs)
    } catch (error: any) {
      console.error(`[WatcherController] Error handling ${channel}:`, error)
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`)
      }
      throw error
    }
  })
}

/**
 * Register Watcher IPC handlers
 */
export function registerWatcherHandlers(mainWindow: BrowserWindow): void {
  // Initialize watcher service with main window
  watcherService.initialize(mainWindow)

  /**
   * Get all active sessions
   */
  handle('watcher:get-sessions', z.tuple([]), async () => {
    const sessions = watcherService.getSessions()
    return sessions
  })

  /**
   * Get a specific session
   */
  handle('watcher:get-session', z.tuple([z.string()]), async (_, sessionId) => {
    const session = watcherService.getSession(sessionId)
    return session || null
  })

  /**
   * Start watching
   */
  handle('watcher:start', z.tuple([]), async () => {
    watcherService.startWatching()
    return { success: true }
  })

  /**
   * Stop watching
   */
  handle('watcher:stop', z.tuple([]), async () => {
    watcherService.stopWatching()
    return { success: true }
  })

  /**
   * Add a new session
   */
  ipcMain.handle(
    'watcher:add-session',
    async (
      _event,
      accountId: string,
      username: string,
      userId: string,
      pid: number,
      placeId: number,
      logFile: string,
      launchConfig?: {
        cookie: string
        placeId: string | number
        jobId?: string
        friendId?: string | number
        installPath?: string
      },
      jobId?: string,
      friendId?: string
    ) => {
      try {
        const session = watcherService.addSession(
          accountId,
          username,
          userId,
          pid,
          placeId,
          logFile,
          launchConfig,
          jobId,
          friendId
        )
        return session
      } catch (error: any) {
        console.error('[WatcherController] Error handling watcher:add-session:', error)
        throw error
      }
    }
  )

  /**
   * Remove a session
   */
  handle('watcher:remove-session', z.tuple([z.string()]), async (_, sessionId) => {
    watcherService.stopSession(sessionId)
    return { success: true }
  })

  /**
   * Get watcher configuration
   */
  handle('watcher:get-config', z.tuple([]), async () => {
    return watcherService.getConfig()
  })

  /**
   * Update watcher configuration
   */
  handle(
    'watcher:set-config',
    z.tuple([
      z.object({
        enabled: z.boolean().optional(),
        autoRestart: z.boolean().optional(),
        restartDelaySeconds: z.number().optional(),
        checkIntervalMs: z.number().optional(),
        logCheckIntervalMs: z.number().optional(),
        enableRAMLimiter: z.boolean().optional(),
        ramLimitMB: z.number().optional()
      })
    ]),
    async (_, config) => {
      watcherService.updateConfig(config)
      return watcherService.getConfig()
    }
  )

  /**
   * Get event log
   */
  handle('watcher:get-events', z.tuple([]), async () => {
    return watcherService.getEventLog()
  })

  /**
   * Clear event log
   */
  handle('watcher:clear-events', z.tuple([]), async () => {
    watcherService.clearEventLog()
    return { success: true }
  })

  /**
   * Clear all (sessions and events)
   */
  handle('watcher:clear-all', z.tuple([]), async () => {
    watcherService.clearAll()
    return { success: true }
  })

  /**
   * Auto-track a newly launched game
   */
  handle(
    'watcher:auto-track-launch',
    z.tuple([
      z.object({
        accountId: z.string(),
        username: z.string(),
        userId: z.string(),
        placeId: z.number(),
        launchConfig: z.any().optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().optional()
      })
    ]),
    async (_, { accountId, username, userId, placeId, launchConfig, displayName, avatarUrl }) => {
      const session = await watcherService.autoTrackLaunchedGame(
        accountId,
        username,
        userId,
        placeId,
        launchConfig,
        displayName,
        avatarUrl
      )
      return session || { success: false, message: 'Failed to track launched game' }
    }
  )

  console.log('[WatcherController] Handlers registered')
}

export { watcherService }
