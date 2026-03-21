import { exec } from 'child_process'
import { promisify } from 'util'
import { memoryCleanupService } from './MemoryCleanupService'

const execAsync = promisify(exec)

/**
 * ProcessMonitor - Monitors process existence and status
 */
export class ProcessMonitor {
  /**
   * Check if a process with the given PID is still running
   */
  static async isProcessRunning(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        // macOS: use ps command
        const { stdout } = await execAsync(`ps -p ${pid} 2>/dev/null`)
        const result = stdout.trim().length > 0
        if (!result) {
          console.log(`[ProcessMonitor] macOS: Process ${pid} not running`)
        }
        return result
      } else if (process.platform === 'win32') {
        // Windows: use tasklist command
        try {
          const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
          // Check if we got actual process data (not just headers)
          const lines = stdout.trim().split('\n').filter(l => l.length > 0)
          const hasProcess = lines.length > 0 && !lines[0].includes('No tasks')
          if (!hasProcess) {
            console.log(`[ProcessMonitor] Windows: Process ${pid} not running`)
          }
          return hasProcess
        } catch (err) {
          console.log(`[ProcessMonitor] Windows: Error checking process ${pid}:`, err)
          return false
        }
      } else if (process.platform === 'linux') {
        // Linux: use ps command
        const { stdout } = await execAsync(`ps -p ${pid} 2>/dev/null`)
        const result = stdout.trim().length > 0
        if (!result) {
          console.log(`[ProcessMonitor] Linux: Process ${pid} not running`)
        }
        return result
      }
    } catch {
      // Process doesn't exist or command failed
      console.log(`[ProcessMonitor] Process ${pid} not running (command error)`)
    }
    return false
  }

  /**
   * Check if Roblox is running (any process)
   */
  static async isRobloxRunning(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        const lines = stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0 && /^\d+$/.test(line))
        return lines.length > 0
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          'tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH'
        )
        return stdout.includes('RobloxPlayerBeta.exe')
      } else if (process.platform === 'linux') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        return stdout.trim().length > 0
      }
    } catch {
      // Roblox not found
    }
    return false
  }

  /**
   * Get all running Roblox process PIDs
   */
  static async getRobloxProcessPids(): Promise<number[]> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        const pids = stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0 && /^\d+$/.test(line))
          .map((line) => parseInt(line, 10))
        
        if (pids.length > 0) {
          console.log(`[ProcessMonitor] Found ${pids.length} Roblox processes on macOS: ${pids.join(', ')}`)
        }
        return pids
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH')
        const lines = stdout.split('\n')
        const pids: number[] = []
        for (const line of lines) {
          const match = line.match(/"RobloxPlayerBeta\.exe","(\d+)"/)
          if (match) {
            pids.push(parseInt(match[1], 10))
          }
        }
        if (pids.length > 0) {
          console.log(`[ProcessMonitor] Found ${pids.length} Roblox processes on Windows: ${pids.join(', ')}`)
        }
        return pids
      } else if (process.platform === 'linux') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        const pids = stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0 && /^\d+$/.test(line))
          .map((line) => parseInt(line, 10))
        
        if (pids.length > 0) {
          console.log(`[ProcessMonitor] Found ${pids.length} Roblox processes on Linux: ${pids.join(', ')}`)
        }
        return pids
      }
    } catch (error) {
      console.error('[ProcessMonitor] Error getting Roblox processes:', error)
    }
    return []
  }

  /**
   * Kill a Roblox process by PID
   */
  static async killProcess(pid: number): Promise<boolean> {
    try {
      console.log(`[ProcessMonitor] Killing Roblox process ${pid}`)
      
      if (process.platform === 'darwin' || process.platform === 'linux') {
        // macOS/Linux: use kill command
        await execAsync(`kill -9 ${pid}`)
        console.log(`[ProcessMonitor] Successfully killed process ${pid}`)
        return true
      } else if (process.platform === 'win32') {
        // Windows: use taskkill command
        await execAsync(`taskkill /PID ${pid} /F`)
        console.log(`[ProcessMonitor] Successfully killed process ${pid}`)
        return true
      }
    } catch (error) {
      console.error(`[ProcessMonitor] Error killing process ${pid}:`, error)
      return false
    }
    return false
  }

  /**
   * Get RAM usage for a process (in MB)
   */
  static async getProcessRAM(pid: number): Promise<number | null> {
    try {
      if (process.platform === 'darwin') {
        // macOS: use ps command, get memory in KB and convert to MB
        const { stdout } = await execAsync(`ps -p ${pid} -o rss=`)
        const trimmed = stdout.trim()
        
        // Validate that we got actual output
        if (!trimmed || trimmed.length === 0) {
          console.log(`[ProcessMonitor] macOS: No output from ps for PID ${pid} - process may not exist`)
          return null
        }
        
        const ramKB = parseInt(trimmed, 10)
        
        // Check for NaN
        if (isNaN(ramKB)) {
          console.log(`[ProcessMonitor] macOS: Invalid RAM value for PID ${pid}: "${trimmed}"`)
          return null
        }
        
        const ramMB = Math.round(ramKB / 1024) // Convert KB to MB
        console.log(`[ProcessMonitor] macOS: PID ${pid} RSS=${ramKB}KB -> ${ramMB}MB`)
        return ramMB
      } else if (process.platform === 'win32') {
        // Windows: use wmic command, get working set (in bytes) and convert to MB
        const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get WorkingSetSize /value`)
        const match = stdout.match(/WorkingSetSize=(\d+)/)
        if (match) {
          const ramBytes = parseInt(match[1], 10)
          
          // Check for NaN
          if (isNaN(ramBytes)) {
            console.log(`[ProcessMonitor] Windows: Invalid RAM bytes for PID ${pid}: "${match[1]}"`)
            return null
          }
          
          const ramMB = Math.round(ramBytes / (1024 * 1024)) // Convert bytes to MB
          console.log(`[ProcessMonitor] Windows: PID ${pid} WorkingSet=${ramBytes}B -> ${ramMB}MB`)
          return ramMB
        } else {
          console.log(`[ProcessMonitor] Windows: Could not parse RAM output for PID ${pid}. Output: "${stdout.substring(0, 200)}"`)
          return null
        }
      } else if (process.platform === 'linux') {
        // Linux: use ps command, get RSS (in KB) and convert to MB
        const { stdout } = await execAsync(`ps -p ${pid} -o rss=`)
        const trimmed = stdout.trim()
        
        // Validate that we got actual output
        if (!trimmed || trimmed.length === 0) {
          console.log(`[ProcessMonitor] Linux: No output from ps for PID ${pid} - process may not exist`)
          return null
        }
        
        const ramKB = parseInt(trimmed, 10)
        
        // Check for NaN
        if (isNaN(ramKB)) {
          console.log(`[ProcessMonitor] Linux: Invalid RAM value for PID ${pid}: "${trimmed}"`)
          return null
        }
        
        const ramMB = Math.round(ramKB / 1024) // Convert KB to MB
        console.log(`[ProcessMonitor] Linux: PID ${pid} RSS=${ramKB}KB -> ${ramMB}MB`)
        return ramMB
      }
    } catch (error) {
      console.error(`[ProcessMonitor] Error getting RAM for process ${pid}:`, error)
    }
    return null
  }

  /**
   * Attempt to clean up RAM using EmptyWorkingSet (Windows only)
   * Returns object with cleanup result and whether process should be restarted
   */
  static async attemptRAMCleanup(pid: number, currentRAM: number, maxRAMMB: number, failureCount: number, enableCleanup: boolean = true): Promise<{
    cleanedUp: boolean
    shouldRestart: boolean
  }> {
    try {
      // Only attempt cleanup if memory is over limit
      if (currentRAM <= maxRAMMB) {
        return { cleanedUp: false, shouldRestart: false }
      }

      // If cleanup is disabled, skip attempts and go straight to restart
      if (!enableCleanup) {
        console.log(`[ProcessMonitor] RAM cleanup disabled - restarting process ${pid}`)
        return { cleanedUp: false, shouldRestart: true }
      }

      // Only attempt cleanup on Windows
      if (process.platform !== 'win32') {
        console.log(`[ProcessMonitor] RAM cleanup only supported on Windows - killing process ${pid}`)
        return { cleanedUp: false, shouldRestart: true }
      }

      console.log(
        `[ProcessMonitor] Attempting RAM cleanup for PID ${pid}: ${currentRAM}MB > ${maxRAMMB}MB (failure count: ${failureCount})`
      )

      // Try to clean up memory using EmptyWorkingSet
      const cleanupSuccess = await memoryCleanupService.emptyWorkingSet(pid)

      if (cleanupSuccess) {
        console.log(`[ProcessMonitor] RAM cleanup succeeded for PID ${pid}`)
        return { cleanedUp: true, shouldRestart: false }
      }

      // Cleanup failed - check if we've failed 3 times
      const newFailureCount = failureCount + 1
      console.log(`[ProcessMonitor] RAM cleanup failed for PID ${pid} (attempt ${newFailureCount}/3)`)

      // After 3 failed cleanup attempts, restart the process
      if (newFailureCount >= 3) {
        console.log(
          `[ProcessMonitor] RAM cleanup failed 3 times for PID ${pid} - will restart client`
        )
        return { cleanedUp: false, shouldRestart: true }
      }

      // Still have attempts left, don't restart yet
      return { cleanedUp: false, shouldRestart: false }
    } catch (error) {
      console.error(`[ProcessMonitor] Error during RAM cleanup attempt for ${pid}:`, error)
      return { cleanedUp: false, shouldRestart: false }
    }
  }

  /**
   * Restart a Roblox session if RAM exceeds limit
   * First attempts EmptyWorkingSet cleanup (Windows only) if enabled
   * If cleanup fails 3 times with RAM still over limit, kills the process
   * Returns true if process was killed and needs restart
   */
  static async checkAndLimitRAM(pid: number, maxRAMMB: number, failureCount: number = 0, enableCleanup: boolean = true): Promise<boolean> {
    try {
      const ramUsage = await this.getProcessRAM(pid)

      if (ramUsage === null) {
        // Process might not exist or command failed
        console.log(`[ProcessMonitor] Could not get RAM for process ${pid} - process may not exist`)
        return false
      }

      console.log(`[ProcessMonitor] Process ${pid} RAM usage: ${ramUsage}MB (limit: ${maxRAMMB}MB)`)

      if (ramUsage > maxRAMMB) {
        // Attempt RAM cleanup via EmptyWorkingSet before killing (if enabled)
        const { cleanedUp, shouldRestart } = await this.attemptRAMCleanup(pid, ramUsage, maxRAMMB, failureCount, enableCleanup)

        if (shouldRestart) {
          console.log(
            `[ProcessMonitor] Process ${pid} exceeded RAM limit (${ramUsage}MB > ${maxRAMMB}MB) - will restart`
          )
          const killed = await this.killProcess(pid)
          return killed
        }

        if (cleanedUp) {
          console.log(`[ProcessMonitor] RAM cleanup succeeded for PID ${pid} - no restart needed`)
          return false
        }

        // Cleanup failed but we still have attempts left - just log and continue
        return false
      }

      return false
    } catch (error) {
      console.error(`[ProcessMonitor] Error checking RAM limit for ${pid}:`, error)
      return false
    }
  }
}

export const processMonitor = new ProcessMonitor()
