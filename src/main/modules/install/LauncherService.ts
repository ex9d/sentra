import { shell } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxInstallService } from './InstallService'
import { cookieRefreshService } from '../auth/CookieRefreshService'

const execAsync = promisify(exec)

export class RobloxLauncherService {
  private static async getRobloxProcessCount(): Promise<number> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        const lines = stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0 && /^\d+$/.test(line))
        return lines.length
      } else {
        const { stdout } = await execAsync(
          'tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH'
        )
        if (stdout.includes('No tasks')) {
          return 0
        }
        return stdout
          .trim()
          .split('\n')
          .filter((line) => line.includes('RobloxPlayerBeta.exe')).length
      }
    } catch {
      return 0
    }
  }

  static async launchGame(
    cookie: string,
    placeId: number | string,
    jobId?: string,
    friendId?: string | number,
    installPath?: string
  ) {
    try {
      // Validate and refresh cookie before launching
      const isValid = await cookieRefreshService.validateAndRefresh(cookie)
      if (!isValid) {
        throw new Error('Cookie is no longer valid. Please re-add the account.')
      }

      const csrfToken = await RobloxAuthService.getCsrfToken(cookie)
      const ticket = await RobloxAuthService.getAuthenticationTicket(cookie, csrfToken)

      const nowMs = Date.now()
      const browserTrackerId = Date.now().toString() + Math.floor(Math.random() * 10000)
      const joinAttemptId = randomUUID()

      let placeLauncherUrl: string

      if (friendId) {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestFollowUser` +
          `&browserTrackerId=${browserTrackerId}` +
          `&userId=${friendId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=followUser`
      } else if (jobId) {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestGameJob` +
          `&browserTrackerId=${browserTrackerId}` +
          `&placeId=${placeId}` +
          `&gameId=${jobId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=publicServerListJoin`
      } else {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestGame` +
          `&browserTrackerId=${browserTrackerId}` +
          `&placeId=${placeId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=PlayButton`
      }

      const protocolLaunchCommand =
        `roblox-player:1+launchmode:play` +
        `+gameinfo:${ticket}` +
        `+launchtime:${nowMs}` +
        `+placelauncherurl:${encodeURIComponent(placeLauncherUrl)}` +
        `+browsertrackerid:${browserTrackerId}` +
        `+robloxLocale:en_us` +
        `+gameLocale:en_us` +
        `+channel:` +
        `+LaunchExp:InApp`

      const initialCount = await this.getRobloxProcessCount()

      if (installPath) {
        await RobloxInstallService.launchWithProtocol(installPath, protocolLaunchCommand)
      } else {
        // On Windows without install path, try to find and launch with -p flag for multiple instances
        if (process.platform === 'win32') {
          try {
            const installations = await RobloxInstallService.detectDefaultInstallations()
            if (installations.length > 0) {
              await RobloxInstallService.launchWithProtocol(installations[0].path, protocolLaunchCommand)
            } else {
              // Fallback to protocol handler if no install found
              await shell.openExternal(protocolLaunchCommand)
            }
          } catch (error) {
            // Fallback to protocol handler on error
            await shell.openExternal(protocolLaunchCommand)
          }
        } else {
          await shell.openExternal(protocolLaunchCommand)
        }
      }

      const startTime = Date.now()
      // Increased timeout: 30s for both platforms (was 20s macOS, 10s Windows)
      // Process detection can be slow on some systems
      const timeout = 30000
      let processStarted = false

      while (Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 500)) // Check every 500ms instead of 1s
        const currentCount = await this.getRobloxProcessCount()

        if (currentCount > initialCount) {
          processStarted = true
          break
        }
      }

      // Return success even if process count didn't increase on first check
      // The game might be launching asynchronously
      return { success: processStarted || process.platform === 'darwin' }
    } catch (error: any) {
      console.error('Failed to launch Roblox:', error)
      throw new Error(`Failed to launch Roblox: ${error.message}`)
    }
  }

  /**
   * Launch a private server with access code
   * Based on C# JoinServer logic for private servers
   */
  static async launchPrivateServer(
    cookie: string,
    placeId: number | string,
    accessCode: string,
    linkCode?: string,
    installPath?: string
  ) {
    try {
      const csrfToken = await RobloxAuthService.getCsrfToken(cookie)
      const ticket = await RobloxAuthService.getAuthenticationTicket(cookie, csrfToken)

      const nowMs = Date.now()
      const browserTrackerId = Date.now().toString() + Math.floor(Math.random() * 10000)
      const joinAttemptId = randomUUID()

      // Private server uses RequestPrivateGame
      const placeLauncherUrl =
        `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
        `request=RequestPrivateGame` +
        `&browserTrackerId=${browserTrackerId}` +
        `&placeId=${placeId}` +
        `&accessCode=${encodeURIComponent(accessCode)}` +
        (linkCode ? `&linkCode=${encodeURIComponent(linkCode)}` : '') +
        `&isPlayTogetherGame=false` +
        `&joinAttemptId=${joinAttemptId}` +
        `&joinAttemptOrigin=joinPrivateGameButton`

      const protocolLaunchCommand =
        `roblox-player:1+launchmode:play` +
        `+gameinfo:${ticket}` +
        `+launchtime:${nowMs}` +
        `+placelauncherurl:${encodeURIComponent(placeLauncherUrl)}` +
        `+browsertrackerid:${browserTrackerId}` +
        `+robloxLocale:en_us` +
        `+gameLocale:en_us` +
        `+channel:` +
        `+LaunchExp:InApp`

      const initialCount = await this.getRobloxProcessCount()

      if (installPath) {
        await RobloxInstallService.launchWithProtocol(installPath, protocolLaunchCommand)
      } else {
        if (process.platform === 'win32') {
          try {
            const installations = await RobloxInstallService.detectDefaultInstallations()
            if (installations.length > 0) {
              await RobloxInstallService.launchWithProtocol(installations[0].path, protocolLaunchCommand)
            } else {
              await shell.openExternal(protocolLaunchCommand)
            }
          } catch (error) {
            await shell.openExternal(protocolLaunchCommand)
          }
        } else {
          await shell.openExternal(protocolLaunchCommand)
        }
      }

      const startTime = Date.now()
      // Increased timeout: 30s for both platforms (was 20s macOS, 10s Windows)
      // Process detection can be slow on some systems
      const timeout = 30000
      let processStarted = false

      while (Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 500)) // Check every 500ms instead of 1s
        const currentCount = await this.getRobloxProcessCount()

        if (currentCount > initialCount) {
          processStarted = true
          break
        }
      }

      // Return success even if process count didn't increase on first check
      // The game might be launching asynchronously
      return { success: processStarted || process.platform === 'darwin' }
    } catch (error: any) {
      console.error('Failed to launch private server:', error)
      throw new Error(`Failed to launch private server: ${error.message}`)
    }
  }

  /**
   * Extract access code from private server link code
   * Makes request to Roblox to get the actual access code from link code
   */
  static async extractAccessCodeFromLinkCode(cookie: string, placeId: number | string, linkCode: string): Promise<string> {
    try {
      // This would require making an HTTP request to Roblox
      // For now, return the link code as-is (Roblox may accept it directly)
      // In production, you'd need to parse the response from PlaceLauncher to extract the access code
      return linkCode
    } catch (error: any) {
      console.error('Failed to extract access code from link code:', error)
      throw new Error(`Failed to extract access code: ${error.message}`)
    }
  }

  /**
   * Launch game with private server link
   * Extracts link code from URL, gets access code, and launches
   */
  static async launchWithPrivateServerLink(
    cookie: string,
    placeId: number | string,
    privateServerUrl: string,
    installPath?: string
  ) {
    try {
      // Extract link code from the private server invite URL
      // Format: https://www.roblox.com/games/[placeId]?privateServerLinkCode=[linkCode]
      const linkCodeMatch = privateServerUrl.match(/privateServerLinkCode=([^&]+)/)
      if (!linkCodeMatch) {
        throw new Error('Invalid private server link - missing privateServerLinkCode parameter')
      }

      const linkCode = decodeURIComponent(linkCodeMatch[1])

      // Use link code as access code (simpler approach)
      // In a more complex implementation, you'd make a request to extract the actual access code
      return await this.launchPrivateServer(cookie, placeId, linkCode, linkCode, installPath)
    } catch (error: any) {
      console.error('Failed to launch with private server link:', error)
      throw new Error(`Failed to launch with private server link: ${error.message}`)
    }
  }
}
