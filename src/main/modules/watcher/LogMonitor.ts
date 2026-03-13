import { existsSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import { CrashDetectionResult, CrashIndicator } from './types'

/**
 * LogMonitor - Monitors Roblox log files for crash indicators
 */
export class LogMonitor {
  private logCache: Map<string, { size: number; content: string }> = new Map()

  /**
   * Get Roblox logs directory based on platform
   */
  static getRobloxLogsDirectory(): string {
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA
      if (localAppData) {
        // Try lowercase 'logs' first
        let logsPath = path.join(localAppData, 'Roblox', 'logs')
        if (existsSync(logsPath)) {
          console.log('[LogMonitor] Found logs at (lowercase):', logsPath)
          return logsPath
        }
        
        // Try uppercase 'Logs'
        logsPath = path.join(localAppData, 'Roblox', 'Logs')
        if (existsSync(logsPath)) {
          console.log('[LogMonitor] Found logs at (uppercase):', logsPath)
          return logsPath
        }
        
        // Return lowercase as default (even if doesn't exist, for consistent path)
        console.warn('[LogMonitor] Neither logs nor Logs found under Roblox, returning default path')
        return path.join(localAppData, 'Roblox', 'logs')
      }
      
      // Fallback to USERPROFILE
      const userProfile = process.env.USERPROFILE
      if (userProfile) {
        let logsPath = path.join(userProfile, 'AppData', 'Local', 'Roblox', 'logs')
        if (existsSync(logsPath)) {
          console.log('[LogMonitor] Found logs via USERPROFILE:', logsPath)
          return logsPath
        }
        
        logsPath = path.join(userProfile, 'AppData', 'Local', 'Roblox', 'Logs')
        if (existsSync(logsPath)) {
          console.log('[LogMonitor] Found logs via USERPROFILE (uppercase):', logsPath)
          return logsPath
        }
        
        return path.join(userProfile, 'AppData', 'Local', 'Roblox', 'logs')
      }
      
      return ''
    } else if (process.platform === 'darwin') {
      return path.join(process.env.HOME || '', 'Library', 'Logs', 'Roblox')
    } else if (process.platform === 'linux') {
      return path.join(process.env.HOME || '', '.local', 'share', 'Roblox', 'logs')
    }
    return ''
  }

  /**
   * Find the most recently modified log file in the Roblox logs directory
   */
  async findLatestLogFile(): Promise<string | null> {
    try {
      const logsDir = LogMonitor.getRobloxLogsDirectory()
      
      if (!logsDir) {
        console.error('[LogMonitor] Could not determine Roblox logs directory for platform:', process.platform)
        return null
      }
      
      if (!existsSync(logsDir)) {
        console.warn('[LogMonitor] Roblox logs directory does NOT exist at:', logsDir)
        console.warn('[LogMonitor] This usually means Roblox hasn\'t been launched yet on this PC.')
        
        // Check parent directory to help diagnose
        const parentDir = path.dirname(logsDir)
        const robloxDir = path.dirname(parentDir)
        console.warn('[LogMonitor] Checking parent directories:')
        console.warn('[LogMonitor]   Roblox folder exists:', existsSync(robloxDir))
        console.warn('[LogMonitor]   Logs folder exists:', existsSync(parentDir))
        console.warn('[LogMonitor] Please launch Roblox at least once on this PC to generate logs.')
        
        return null
      }

      const fs = await import('fs/promises')
      const files = await fs.readdir(logsDir)
      
      console.log('[LogMonitor] Found logs directory, scanning files:', files.length)

      let latestFile: string | null = null
      let latestTime = 0

      for (const file of files) {
        // Look for .log files or any file that looks like a log (e.g., no extension on macOS)
        const isLogFile = file.endsWith('.log') || file.includes('Player') || file.match(/^\d+\.log/)
        if (isLogFile) {
          const filePath = path.join(logsDir, file)
          try {
            const stat = statSync(filePath)
            if (stat.mtimeMs > latestTime) {
              latestTime = stat.mtimeMs
              latestFile = file
            }
          } catch (e) {
            console.log(`[LogMonitor] Could not stat file ${file}:`, e)
          }
        }
      }

      if (latestFile) {
        const result = path.join(logsDir, latestFile)
        console.log('[LogMonitor] Found latest log file:', result)
        return result
      } else {
        console.warn('[LogMonitor] No log files found in directory')
        console.warn('[LogMonitor] Launch Roblox to generate logs')
        return null
      }
    } catch (error) {
      console.error('[LogMonitor] Error finding latest log file:', error)
      return null
    }
  }

  /**
   * Get the file size of a log file
   */
  getLogFileSize(logFilePath: string): number {
    try {
      if (!existsSync(logFilePath)) {
        return 0
      }
      return statSync(logFilePath).size
    } catch (error) {
      console.error('[LogMonitor] Error getting log file size:', error)
      return 0
    }
  }

  /**
   * Read only new content from a log file since last read
   * Returns the new content and updates the cache
   */
  async readNewLogContent(logFilePath: string, lastSize: number): Promise<string> {
    try {
      if (!existsSync(logFilePath)) {
        console.log('[LogMonitor] Log file does not exist:', logFilePath)
        return ''
      }

      const currentSize = statSync(logFilePath).size
      
      // If file was truncated, read from the beginning
      if (currentSize < lastSize) {
        console.log('[LogMonitor] File was truncated, reading entire file')
        const content = await readFile(logFilePath, 'utf-8')
        return content
      }

      // If file size is the same, no new content
      if (currentSize === lastSize) {
        return ''
      }

      // Read entire file and get the new part
      // We use byte offset to track position, but need to be careful with multi-byte characters
      const content = await readFile(logFilePath, 'utf-8')
      
      // Use buffer to accurately track bytes
      const buffer = Buffer.from(content, 'utf-8')
      
      // If we have a byte offset and it's valid, slice from there
      if (lastSize > 0 && lastSize < buffer.length) {
        const newBuffer = buffer.slice(lastSize)
        const newContent = newBuffer.toString('utf-8')
        console.log(`[LogMonitor] Read ${newContent.length} new characters from log file`)
        return newContent
      }

      // Default: return entire content if we can't determine offset
      console.log('[LogMonitor] Returning entire content')
      return content
    } catch (error) {
      console.error('[LogMonitor] Error reading log file:', error)
      return ''
    }
  }

  /**
   * Detect crash indicators in log content with sophisticated disconnect code analysis
   */
  detectCrashIndicators(logContent: string): CrashDetectionResult {
    if (!logContent || logContent.trim().length === 0) {
      return { crashed: false }
    }

    // Normalize line endings (Windows \r\n, old Mac \r, Unix \n)
    const normalizedContent = logContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    console.log(`[LogMonitor] Scanning ${normalizedContent.length} characters for crash indicators`)

    // Phase 1: Check for basic hard crash indicators first (always fatal)
    const crashIndicators = [
      CrashIndicator.Segfault,
      CrashIndicator.AccessViolation
    ]

    for (const indicator of crashIndicators) {
      if (normalizedContent.toLowerCase().includes(indicator.toLowerCase())) {
        console.log(`[LogMonitor] Found hard crash indicator: "${indicator}"`)
        return {
          crashed: true,
          reason: indicator
        }
      }
    }

    // Phase 2: Scan the last 100 lines for disconnect codes
    const lines = normalizedContent.split('\n')
    const lastLines = lines.slice(-100)
    const lastContent = lastLines.join('\n')

    console.log(`[LogMonitor] Analyzing last ${lastLines.length} lines for disconnect codes`)

    // Look for disconnect code pattern: "Sending disconnect with reason: <CODE>"
    const disconnectMatch = lastContent.match(/Sending disconnect with reason:\s*(\d+)/i)
    if (disconnectMatch) {
      const code = parseInt(disconnectMatch[1], 10)
      const disconnectInfo = this.categorizeDisconnectCode(code, lastContent)
      console.log(`[LogMonitor] Found disconnect code: ${code} -> ${disconnectInfo.status}`)
      return {
        crashed: true,
        reason: `${disconnectInfo.status}: ${disconnectInfo.explanation}`
      }
    }

    // Alternative pattern: "Lost connection with reason : <MESSAGE>"
    const lostConnMatch = lastContent.match(/Lost connection with reason\s*:\s*([^\n\r]+)/i)
    if (lostConnMatch) {
      const message = lostConnMatch[1].trim()
      console.log(`[LogMonitor] Found lost connection: ${message}`)
      return {
        crashed: true,
        reason: `Connection Lost: ${message}`
      }
    }

    // Phase 3: Check last 20 lines for graphics/engine crashes
    const last20Lines = lines.slice(-20)
    const last20Content = last20Lines.join('\n')

    if (last20Content.toLowerCase().includes('d3d11 device removed')) {
      console.log('[LogMonitor] Found graphics crash: D3D11 Device Removed')
      return {
        crashed: true,
        reason: 'Graphics Crash: D3D11 Device Removed - Graphics hardware error or driver crash'
      }
    }

    if (last20Content.toLowerCase().includes('rbxcrash')) {
      console.log('[LogMonitor] Found engine crash: RBXCRASH')
      return {
        crashed: true,
        reason: 'Engine Crash: RBXCRASH - Roblox engine fatal error'
      }
    }

    // Phase 4: Fallback - if we see any sign of process exit, consider it a crash
    // Check for common Roblox exit messages
    if (
      lastContent.toLowerCase().includes('process exiting') ||
      lastContent.toLowerCase().includes('shutting down') ||
      lastContent.toLowerCase().includes('exit code')
    ) {
      console.log('[LogMonitor] Found process termination pattern')
      return {
        crashed: true,
        reason: 'Abrupt Process Termination: Game closed unexpectedly'
      }
    }

    console.log('[LogMonitor] No crash indicators detected in log')
    return { crashed: false }
  }

  /**
   * Map disconnect code to category and explanation
   */
  private categorizeDisconnectCode(
    code: number,
    logContent: string
  ): { status: string; explanation: string } {
    // Category A: Account/Security Issues
    if (code === 600) {
      return {
        status: 'Experience Ban',
        explanation: 'Banned by the game creator via API.'
      }
    }
    if (code === 273 || code === 264) {
      return {
        status: 'Security/Duplicate',
        explanation: 'Account launched from another device or joined while banned/warned.'
      }
    }
    if (code === 272) {
      return {
        status: 'Security Kick',
        explanation: 'Exploit detected or Security Key mismatch.'
      }
    }

    // Category B: Connection/Network Issues
    if (code === 277 || code === 279 || code === 266) {
      return {
        status: 'Network Failure',
        explanation: 'Local internet dropped or server timed out.'
      }
    }
    if (code === 260 || code === 261 || code === 262) {
      return {
        status: 'Data Stream Error',
        explanation: 'Problem receiving or sending game data packets.'
      }
    }
    if (code === 529) {
      return {
        status: 'Roblox Service Down',
        explanation: 'Roblox HTTP servers are experiencing technical difficulties.'
      }
    }

    // Category C: Developer/Server Actions
    if (code === 267) {
      // Extract custom kick reason from 2 lines above
      const lines = logContent.split('\n')
      const disconnectLine = lines.findIndex((line) =>
        line.includes('Sending disconnect with reason: 267')
      )
      if (disconnectLine > 1) {
        const customReason = lines[disconnectLine - 2]?.trim() || 'Unknown reason'
        return {
          status: 'Manual Kick',
          explanation: `Kicked by developer: ${customReason}`
        }
      }
      return {
        status: 'Manual Kick',
        explanation: 'Kicked by developer (reason unavailable).'
      }
    }
    if (code === 256 || code === 274) {
      return {
        status: 'Server Shutdown',
        explanation: 'Developer closed the server (likely for an update).'
      }
    }
    if (code === 271 || code === 278) {
      return {
        status: 'Idle Kick',
        explanation: 'Kicked for being inactive for 20 minutes.'
      }
    }

    // Category D: Device/System Limits
    if (code === 286 || code === 292) {
      return {
        status: 'Memory Crash',
        explanation: 'Device ran out of RAM. Lower graphics or close background apps.'
      }
    }
    if (code === 280) {
      return {
        status: 'Update Required',
        explanation: 'Roblox client is out of date.'
      }
    }

    // Category E: Teleport Failures
    if (code >= 769 && code <= 773) {
      return {
        status: 'Teleport Error',
        explanation: 'Failed to move between places (Server full, restricted, or under review).'
      }
    }

    // Fallback for unknown codes
    return {
      status: 'Unknown Disconnect',
      explanation: `Disconnected with code ${code}. Check logs for details.`
    }
  }

  /**
   * Parse user info from log file
   */
  async parseUserInfoFromLog(logFilePath: string): Promise<{ username?: string; userId?: string } | null> {
    try {
      if (!existsSync(logFilePath)) {
        return null
      }

      const content = await readFile(logFilePath, 'utf-8')
      const result: { username?: string; userId?: string } = {}

      // Look for UserName patterns
      const userNameMatch = content.match(/\[.*\]\s+UserName[:\s=]+([^\s\n]+)/i)
      if (userNameMatch) {
        result.username = userNameMatch[1]
      }

      // Look for UserId patterns
      const userIdMatch = content.match(/\[.*\]\s+UserId[:\s=]+(\d+)/i)
      if (userIdMatch) {
        result.userId = userIdMatch[1]
      }

      return Object.keys(result).length > 0 ? result : null
    } catch (error) {
      console.error('[LogMonitor] Error parsing user info from log:', error)
      return null
    }
  }

  /**
   * Check if a log file contains PlaceId information
   */
  async getPlaceIdFromLog(logFilePath: string): Promise<number | null> {
    try {
      if (!existsSync(logFilePath)) {
        return null
      }

      const content = await readFile(logFilePath, 'utf-8')

      // Look for PlaceId pattern
      const placeIdMatch = content.match(/PlaceId[:\s=]+(\d+)/i)
      if (placeIdMatch) {
        return parseInt(placeIdMatch[1], 10)
      }

      return null
    } catch (error) {
      console.error('[LogMonitor] Error getting PlaceId from log:', error)
      return null
    }
  }

  /**
   * Clear the cache for a log file
   */
  clearCache(logFilePath: string): void {
    this.logCache.delete(logFilePath)
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.logCache.clear()
  }
}

export const logMonitor = new LogMonitor()
