/**
 * Watcher Session Types and Interfaces
 */

export type SessionStatus = 'running' | 'crashed' | 'restarting'

export interface WatcherSession {
  id: string
  accountId: string
  username: string
  displayName?: string
  userId: string
  avatarUrl?: string
  placeId: number
  jobId?: string
  friendId?: string
  pid: number
  logFile: string
  lastLogSize: number
  lastUpdate: number
  status: SessionStatus
  restartCount: number
  restartAttempts: number
  lastCrashTime?: number
  lastCrashReason?: string
  lastRestartTime?: number
  lastStartTime?: number // Track when the session started for timeout restart
  ramCleanupFailureCount?: number // Track consecutive EmptyWorkingSet failures (resets on success)
  launchConfig?: LaunchConfig
}

export interface LaunchConfig {
  cookie: string
  placeId: number | string
  jobId?: string
  friendId?: string | number
  installPath?: string
}

export interface CrashDetectionResult {
  crashed: boolean
  reason?: string
}

export interface WatcherConfig {
  enabled: boolean
  autoRestart: boolean
  restartDelaySeconds: number
  checkIntervalMs: number
  logCheckIntervalMs: number
  ramLimitMB?: number // Max RAM per process in MB (optional, e.g., 800)
  enableRAMLimiter?: boolean // Enable RAM limiting feature
  enableRAMCleanupAttempts?: boolean // Enable attempting cleanup before restart (Windows only)
  clientTimeoutSeconds?: number // Auto-restart client after X seconds (optional)
  enableClientTimeout?: boolean // Enable client timeout restart feature
  cpuLimitPercent?: number // Max CPU usage percentage (optional)
  enableCPULimiter?: boolean // Enable CPU limiting feature
}

export interface WatcherEvent {
  timestamp: number
  type: 'session-started' | 'session-crashed' | 'session-restarted' | 'session-stopped' | 'error'
  sessionId: string
  username: string
  message: string
  details?: any
}

export enum CrashIndicator {
  ProcessNotRunning = 'ProcessNotRunning',
  DestroyLuaApp = 'destroyLuaApp',
  SignalRCoreError = 'SignalRCoreError',
  Segfault = 'segmentation fault',
  AccessViolation = 'Access violation'
}
