import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * MemoryCleanupService - Cleans up process RAM using Windows API via PowerShell
 * Only works on Windows; gracefully handles non-Windows platforms
 */
export class MemoryCleanupService {
  private static instance: MemoryCleanupService | null = null
  private isWindowsPlatform: boolean = false

  private constructor() {
    this.isWindowsPlatform = process.platform === 'win32'
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MemoryCleanupService {
    if (!this.instance) {
      this.instance = new MemoryCleanupService()
    }
    return this.instance
  }

  /**
   * Clean up process RAM by triggering Windows memory management via PowerShell
   * Uses Clear-HostMemory (Windows 10+) or EmptyWorkingSet via .NET
   * Returns true if successful, false otherwise
   */
  async emptyWorkingSet(pid: number): Promise<boolean> {
    if (!this.isWindowsPlatform) {
      console.log(`[MemoryCleanupService] EmptyWorkingSet not supported on ${process.platform} - skipping`)
      return false
    }

    try {
      // PowerShell script to call EmptyWorkingSet
      // Uses .NET to call Windows API function: [System.Diagnostics.Process]::GetProcessById($pid).EmptyWorkingSet()
      const psScript = `[GC]::Collect();[GC]::WaitForPendingFinalizers();$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue;if($p){$p.MinWorkingSet=1MB;$p.MinWorkingSet=$p.WorkingSet64;[System.Diagnostics.Process]::GetProcessById(${pid}).EmptyWorkingSet();exit 0}else{exit 1}`

      const { stderr } = await execAsync(`powershell -NoProfile -Command "${psScript}"`, {
        timeout: 5000,
        windowsHide: true
      })

      if (stderr && stderr.length > 0) {
        console.log(`[MemoryCleanupService] PowerShell stderr: ${stderr}`)
      }

      console.log(`[MemoryCleanupService] Successfully cleaned memory for process ${pid}`)
      return true
    } catch (error) {
      console.error(`[MemoryCleanupService] Error calling EmptyWorkingSet for PID ${pid}:`, error)
      return false
    }
  }

  /**
   * Check if platform supports EmptyWorkingSet cleanup
   */
  isSupported(): boolean {
    return this.isWindowsPlatform
  }
}

export const memoryCleanupService = MemoryCleanupService.getInstance()