import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import { z } from 'zod'
// LogMetadata defined locally to avoid import issues
interface LogMetadata {
  filename: string
  path: string
  lastModified: number
  size: number
  timestamp?: string
  channel?: string
  version?: string
  jobId?: string
  universeId?: string
  placeId?: string
  serverIp?: string
}

// Build Windows logs path with fallbacks
const getWindowsLogsPath = (): string => {
  const localAppData = process.env.LOCALAPPDATA
  console.log('[LogsController] LOCALAPPDATA env var:', localAppData)
  console.log('[LogsController] LOCALAPPDATA has spaces:', localAppData?.includes(' '))
  
  if (localAppData) {
    // Try lowercase 'logs' first
    let logsPath = path.join(localAppData, 'Roblox', 'logs')
    console.log('[LogsController] Trying path (lowercase logs):', logsPath)
    
    if (existsSync(logsPath)) {
      console.log('[LogsController] ✓ Found logs directory at:', logsPath)
      return logsPath
    }
    
    // Try uppercase 'Logs'
    logsPath = path.join(localAppData, 'Roblox', 'Logs')
    console.log('[LogsController] Trying path (uppercase Logs):', logsPath)
    
    if (existsSync(logsPath)) {
      console.log('[LogsController] ✓ Found logs directory at:', logsPath)
      return logsPath
    }
    
    console.warn('[LogsController] Neither logs nor Logs directory found under Roblox')
    return logsPath // Return the lowercase version even if not found, for error reporting
  }

  // Fallback to USERPROFILE
  console.warn('[LogsController] LOCALAPPDATA not set, trying USERPROFILE')
  const userProfile = process.env.USERPROFILE
  console.log('[LogsController] USERPROFILE env var:', userProfile)
  console.log('[LogsController] USERPROFILE has spaces:', userProfile?.includes(' '))
  
  if (userProfile) {
    let fallbackPath = path.join(userProfile, 'AppData', 'Local', 'Roblox', 'logs')
    console.log('[LogsController] Trying fallback path (lowercase logs):', fallbackPath)
    
    if (existsSync(fallbackPath)) {
      console.log('[LogsController] ✓ Found logs directory at:', fallbackPath)
      return fallbackPath
    }
    
    fallbackPath = path.join(userProfile, 'AppData', 'Local', 'Roblox', 'Logs')
    console.log('[LogsController] Trying fallback path (uppercase Logs):', fallbackPath)
    
    if (existsSync(fallbackPath)) {
      console.log('[LogsController] ✓ Found logs directory at:', fallbackPath)
      return fallbackPath
    }
    
    console.warn('[LogsController] Neither logs nor Logs directory found via USERPROFILE')
    return fallbackPath // Return the uppercase version for error reporting
  }

  console.error('[LogsController] Neither LOCALAPPDATA nor USERPROFILE are set!')
  return ''
}

const LOGS_DIR =
  process.platform === 'win32'
    ? getWindowsLogsPath()
    : process.platform === 'darwin'
    ? path.join(process.env.HOME || '', 'Library', 'Logs', 'Roblox')
    : ''

// Log the resolved path for debugging
console.log('[LogsController] Resolved LOGS_DIR:', LOGS_DIR)
console.log('[LogsController] Platform:', process.platform)
console.log('[LogsController] LOGS_DIR exists:', existsSync(LOGS_DIR))

const handle = <T extends any[]>(
  channel: string,
  schema: z.ZodType<T>,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any>
) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const validated = schema.parse(args)
      return await handler(event, ...validated)
    } catch (err) {
      console.error(`IPC Validation Error on ${channel}:`, err)
      throw err
    }
  })
}

const logFilenameSchema = z.string().regex(/^[^\/\\]+$/, 'Invalid log filename format')

export const registerLogsHandlers = () => {
  handle('get-logs', z.tuple([]), async () => {
    try {
      console.log('[LogsController] get-logs called, checking LOGS_DIR:', LOGS_DIR)
      if (!existsSync(LOGS_DIR)) {
        console.warn('[LogsController] Roblox logs directory does NOT exist at:', LOGS_DIR)
        const logsDirParent = path.dirname(LOGS_DIR)
        const robloxDir = path.dirname(logsDirParent)
        console.log('[LogsController] Diagnostic info:')
        console.log('  Roblox dir exists:', existsSync(robloxDir), '→', robloxDir)
        console.log('  logs dir exists:', existsSync(logsDirParent), '→', logsDirParent)
        console.log('[LogsController] Please note: Roblox must be launched at least once to generate logs')
        return []
      }

      console.log('[LogsController] Logs directory EXISTS at:', LOGS_DIR)

      let files: string[] = []
      try {
        const entries = await fs.readdir(LOGS_DIR, { withFileTypes: true })
        console.log('[LogsController] Successfully read directory. Found entries:', entries.length)
        
        files = entries
          .filter((entry) => {
            const isFile = entry.isFile()
            return isFile
          })
          .map((entry) => entry.name)
        
        console.log('[LogsController] Files found:', files.length)
        if (files.length > 0) {
          console.log('[LogsController] First 5 files:', files.slice(0, 5))
        }
      } catch (err) {
        console.error('[LogsController] ERROR reading LOGS_DIR:', err)
        console.error('[LogsController] Error code:', (err as any)?.code)
        console.error('[LogsController] Error message:', (err as any)?.message)
        return []
      }

      if (files.length === 0) {
        console.warn('[LogsController] No files found in the logs directory')
        return []
      }

      // Process log files directly without multithreading
      const logs: LogMetadata[] = []

      for (const file of files) {
        try {
          const filePath = path.join(LOGS_DIR, file)
          const stats = await fs.stat(filePath)

          // Skip directories
          if (!stats.isFile()) {
            continue
          }

          // Parse log content
          let content = ''
          try {
            content = await fs.readFile(filePath, 'utf-8')
          } catch (readErr) {
            console.warn(`[LogsController] Could not read file ${file}:`, readErr)
            continue
          }

          const metadata: any = {
            filename: file,
            path: filePath,
            lastModified: stats.mtimeMs,
            size: stats.size
          }

          // Parse metadata from content
          const timestampMatch = content.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/m)
          if (timestampMatch) metadata.timestamp = timestampMatch[1]

          const channelMatch = content.match(/\[FLog::ClientRunInfo\] The channel is (\w+)/)
          if (channelMatch) metadata.channel = channelMatch[1]

          const versionMatchA = content.match(/"version":"([\d.]+)"/)
          const versionMatchB = content.match(/Server Prefix: ([\d.]+)_/)
          const versionMatchC = content.match(/userAgent: Roblox\/[^/]+\/([\d.]+)/)

          if (versionMatchA) metadata.version = versionMatchA[1]
          else if (versionMatchB) metadata.version = versionMatchB[1]
          else if (versionMatchC) metadata.version = versionMatchC[1]

          const jobIdMatchA = content.match(/! Joining game '([0-9a-f-]{36})'/)
          const jobIdMatchB = content.match(/game_\d+_\d+_([0-9a-f-]{36})_/)

          if (jobIdMatchA) metadata.jobId = jobIdMatchA[1]
          else if (jobIdMatchB) metadata.jobId = jobIdMatchB[1]

          const universeIdMatch = content.match(/universeid:(\d+)/)
          if (universeIdMatch) metadata.universeId = universeIdMatch[1]

          const placeIdMatchA = content.match(/placeid:(\d+)/)
          const placeIdMatchB = content.match(/place (\d+) at/)

          if (placeIdMatchA) metadata.placeId = placeIdMatchA[1]
          else if (placeIdMatchB) metadata.placeId = placeIdMatchB[1]

          const ipMatchA = content.match(/UDMUX Address = ([\d.]+)/)
          const ipMatchB = content.match(/Connection accepted from ([\d.]+)/)
          const ipMatchC = content.match(/Connecting to UDMUX server ([\d.]+)/)

          if (ipMatchA) metadata.serverIp = ipMatchA[1]
          else if (ipMatchB) metadata.serverIp = ipMatchB[1]
          else if (ipMatchC) metadata.serverIp = ipMatchC[1]

          logs.push(metadata as LogMetadata)
        } catch (err) {
          console.error(`[LogsController] Error processing file ${file}:`, err)
          continue
        }
      }

      console.log('[LogsController] Processed logs count:', logs.length)
      return logs.sort((a, b) => b.lastModified - a.lastModified)
    } catch (error) {
      console.error('[LogsController] Error fetching logs:', error)
      return []
    }
  })

  handle('get-log-content', z.tuple([logFilenameSchema]), async (_, filename) => {
    try {
      const filePath = path.join(LOGS_DIR, filename)
      if (path.dirname(filePath) !== LOGS_DIR) {
        throw new Error('Invalid file path')
      }
      return await fs.readFile(filePath, 'utf8')
    } catch (error) {
      console.error('Error reading log content:', error)
      throw error
    }
  })

  handle('delete-log', z.tuple([logFilenameSchema]), async (_, filename) => {
    try {
      const filePath = path.join(LOGS_DIR, filename)
      if (path.dirname(filePath) !== LOGS_DIR) {
        throw new Error('Invalid file path')
      }
      if (existsSync(filePath)) {
        await fs.unlink(filePath)
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting log:', error)
      return false
    }
  })

  handle('delete-all-logs', z.tuple([]), async () => {
    try {
      if (!existsSync(LOGS_DIR)) return true
      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files.filter((f) => f.endsWith('.log'))
      await Promise.all(
        logFiles.map((f) =>
          fs.unlink(path.join(LOGS_DIR, f)).catch((e) => console.error(`Failed to delete ${f}:`, e))
        )
      )
      return true
    } catch (error) {
      console.error('Error deleting all logs:', error)
      return false
    }
  })

  handle('open-log-file', z.tuple([logFilenameSchema]), async (_, filename) => {
    try {
      const filePath = path.join(LOGS_DIR, filename)
      if (path.dirname(filePath) !== LOGS_DIR) {
        throw new Error('Invalid file path')
      }

      if (process.platform === 'win32') {
        try {
          const child = spawn('notepad.exe', [filePath], {
            detached: true,
            stdio: 'ignore'
          })
          child.unref()
          return true
        } catch (err) {
          console.error('Failed to launch Notepad, falling back to default handler:', err)
        }
      }

      const result = await shell.openPath(filePath)
      if (result) {
        console.error('shell.openPath returned an error:', result)
        return false
      }

      return true
    } catch (error) {
      console.error('Error opening log file:', error)
      return false
    }
  })
}
