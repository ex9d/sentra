import { WatcherSession, SessionStatus, LaunchConfig } from './types'
import { randomUUID } from 'crypto'

/**
 * SessionManager - Tracks and manages active Watcher sessions
 */
export class SessionManager {
  private sessions: Map<string, WatcherSession> = new Map()
  private sessionsByPid: Map<number, string> = new Map() // PID -> Session ID mapping
  private sessionsByAccountId: Map<string, string> = new Map() // Account ID -> Session ID mapping

  /**
   * Create a new session for a launched Roblox client
   */
  createSession(
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
    const sessionId = randomUUID()

    const session: WatcherSession = {
      id: sessionId,
      accountId,
      username,
      displayName: displayName || username,
      userId,
      avatarUrl,
      placeId,
      jobId,
      friendId,
      pid,
      logFile,
      lastLogSize: 0,
      lastUpdate: Date.now(),
      lastStartTime: Date.now(), // Track when session started
      ramCleanupFailureCount: 0, // Track consecutive RAM cleanup failures
      status: 'running',
      restartCount: 0,
      restartAttempts: 0,
      lastRestartTime: undefined, // Grace period only starts after a restart
      launchConfig
    }

    this.sessions.set(sessionId, session)
    this.sessionsByPid.set(pid, sessionId)
    this.sessionsByAccountId.set(accountId, sessionId)

    return session
  }

  /**
   * Get session by ID
   */
  getSessionById(sessionId: string): WatcherSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Get session by PID
   */
  getSessionByPid(pid: number): WatcherSession | undefined {
    const sessionId = this.sessionsByPid.get(pid)
    return sessionId ? this.sessions.get(sessionId) : undefined
  }

  /**
   * Get session by account ID
   */
  getSessionByAccountId(accountId: string): WatcherSession | undefined {
    const sessionId = this.sessionsByAccountId.get(accountId)
    return sessionId ? this.sessions.get(sessionId) : undefined
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): WatcherSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = status
      session.lastUpdate = Date.now()

      if (status === 'crashed') {
        session.lastCrashTime = Date.now()
      }
    }
  }

  /**
   * Update last restart time
   */
  updateLastRestartTime(sessionId: string, timestamp: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastRestartTime = timestamp
      session.lastUpdate = Date.now()
    }
  }

  /**
   * Update last start time (tracks when the Roblox client process started)
   */
  updateLastStartTime(sessionId: string, timestamp?: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastStartTime = timestamp || Date.now()
      session.lastUpdate = Date.now()
    }
  }

  /**
   * Update session log size
   */
  updateLogSize(sessionId: string, newSize: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastLogSize = newSize
      session.lastUpdate = Date.now()
    }
  }

  /**
   * Increment restart count
   */
  incrementRestartCount(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.restartCount++
      return session.restartCount
    }
    return 0
  }

  /**
   * Increment restart attempts (for failed restart retries)
   */
  incrementRestartAttempts(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.restartAttempts++
      return session.restartAttempts
    }
    return 0
  }

  /**
   * Reset restart attempts (called on successful restart)
   */
  resetRestartAttempts(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.restartAttempts = 0
    }
  }

  /**
   * Update last crash reason
   */
  updateLastCrashReason(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastCrashReason = reason
      session.lastCrashTime = Date.now()
      session.lastUpdate = Date.now()
    }
  }

  /**
   * Update PID for a session (e.g., after restart)
   */
  updateSessionPid(sessionId: string, newPid: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Remove old PID mapping
      this.sessionsByPid.delete(session.pid)

      // Update session with new PID
      session.pid = newPid

      // Add new PID mapping
      this.sessionsByPid.set(newPid, sessionId)
    }
  }

  /**
   * Update log file for a session
   */
  updateSessionLogFile(sessionId: string, logFile: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.logFile = logFile
      session.lastLogSize = 0 // Reset log size when switching files
      session.lastUpdate = Date.now()
    }
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.sessionsByPid.delete(session.pid)
      this.sessionsByAccountId.delete(session.accountId)
      this.sessions.delete(sessionId)
    }
  }

  /**
   * Remove session by PID
   */
  removeSessionByPid(pid: number): void {
    const sessionId = this.sessionsByPid.get(pid)
    if (sessionId) {
      this.removeSession(sessionId)
    }
  }

  /**
   * Remove session by account ID
   */
  removeSessionByAccountId(accountId: string): void {
    const sessionId = this.sessionsByAccountId.get(accountId)
    if (sessionId) {
      this.removeSession(sessionId)
    }
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear()
    this.sessionsByPid.clear()
    this.sessionsByAccountId.clear()
  }

  /**
   * Get count of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Check if any sessions are running for a specific account
   */
  hasSessionForAccount(accountId: string): boolean {
    return this.sessionsByAccountId.has(accountId)
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()
