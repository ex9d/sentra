import { ipcRenderer } from 'electron'
import { invoke } from './invoke'
import { z } from 'zod'

// ============================================================================
// WATCHER API
// ============================================================================

// Define schemas for type safety
const watcherSessionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  userId: z.string(),
  avatarUrl: z.string().optional(),
  placeId: z.number(),
  jobId: z.string().optional(),
  friendId: z.string().optional(),
  pid: z.number(),
  logFile: z.string(),
  lastLogSize: z.number(),
  lastUpdate: z.number(),
  status: z.enum(['running', 'crashed', 'restarting']),
  restartCount: z.number(),
  restartAttempts: z.number(),
  lastCrashTime: z.number().optional(),
  lastCrashReason: z.string().optional(),
  launchConfig: z.object({
    cookie: z.string(),
    placeId: z.union([z.string(), z.number()]),
    jobId: z.string().optional(),
    friendId: z.union([z.string(), z.number()]).optional(),
    installPath: z.string().optional()
  }).optional()
})

const watcherConfigSchema = z.object({
  enabled: z.boolean(),
  autoRestart: z.boolean(),
  restartDelaySeconds: z.number(),
  checkIntervalMs: z.number(),
  logCheckIntervalMs: z.number()
})

const watcherEventSchema = z.object({
  timestamp: z.number(),
  type: z.enum(['session-started', 'session-crashed', 'session-restarted', 'session-stopped', 'error']),
  sessionId: z.string(),
  username: z.string(),
  message: z.string(),
  details: z.any().optional()
})

export const watcherApi = {
  // Get all active sessions
  getSessions: () =>
    invoke('watcher:get-sessions', z.array(watcherSessionSchema)),

  // Get a specific session
  getSession: (sessionId: string) =>
    invoke('watcher:get-session', watcherSessionSchema.nullable(), sessionId),

  // Start watching
  start: () =>
    invoke('watcher:start', z.object({ success: z.boolean() })),

  // Stop watching
  stop: () =>
    invoke('watcher:stop', z.object({ success: z.boolean() })),

  // Add a new session
  addSession: (
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
    }
  ) =>
    invoke(
      'watcher:add-session',
      watcherSessionSchema,
      accountId,
      username,
      userId,
      pid,
      placeId,
      logFile,
      launchConfig
    ),

  // Remove a session
  removeSession: (sessionId: string) =>
    invoke('watcher:remove-session', z.object({ success: z.boolean() }), sessionId),

  // Get watcher configuration
  getConfig: () =>
    invoke('watcher:get-config', watcherConfigSchema),

  // Update watcher configuration
  setConfig: (config: Partial<{
    enabled: boolean
    autoRestart: boolean
    restartDelaySeconds: number
    checkIntervalMs: number
    logCheckIntervalMs: number
  }>) =>
    invoke('watcher:set-config', watcherConfigSchema, config),

  // Get event log
  getEvents: () =>
    invoke('watcher:get-events', z.array(watcherEventSchema)),

  // Clear event log
  clearEvents: () =>
    invoke('watcher:clear-events', z.object({ success: z.boolean() })),

  // Clear all (sessions and events)
  clearAll: () =>
    invoke('watcher:clear-all', z.object({ success: z.boolean() })),

  // Listen for session crashed events
  onSessionCrashed: (callback: (data: { sessionId: string; username: string; reason: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => {
      callback(data)
    }
    ipcRenderer.on('watcher:session-crashed', handler)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('watcher:session-crashed', handler)
    }
  },

  // Listen for session restarted events
  onSessionRestarted: (callback: (data: { sessionId: string; username: string; restartCount: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => {
      callback(data)
    }
    ipcRenderer.on('watcher:session-restarted', handler)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('watcher:session-restarted', handler)
    }
  },

  // Listen for watcher events in real-time
  onEvent: (callback: (event: {
    timestamp: number
    type: 'session-started' | 'session-crashed' | 'session-restarted' | 'session-stopped' | 'error'
    sessionId: string
    username: string
    message: string
    details?: any
  }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, watcherEvent: any) => {
      callback(watcherEvent)
    }
    ipcRenderer.on('watcher:event', handler)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('watcher:event', handler)
    }
  },

  // Auto-track a newly launched game
  autoTrackLaunchedGame: (
    accountId: string,
    username: string,
    userId: string,
    placeId: number,
    launchConfig?: any,
    displayName?: string,
    avatarUrl?: string
  ) =>
    invoke(
      'watcher:auto-track-launch',
      z.any(), // Returns session or null
      {
        accountId,
        username,
        userId,
        placeId,
        launchConfig,
        displayName,
        avatarUrl
      }
    ),

  // Listen for sessions updates
  onSessionsUpdated: (callback: (sessions: typeof watcherSessionSchema) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessions: any) => {
      callback(sessions)
    }
    ipcRenderer.on('watcher:sessions-updated', handler)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('watcher:sessions-updated', handler)
    }
  }
}
