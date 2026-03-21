/**
 * UserAgentService manages realistic user agents for chromium instances
 * Provides rotation, auto-swap, and persistent storage of UA preferences
 */

import { storageService } from '../system/StorageService'

export class UserAgentService {
  // List of diverse user agents - Chrome, Safari, Firefox, Edge, Opera, Brave, Vivaldi
  private static readonly USER_AGENTS = [
    // Chrome - Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.123 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.88 Safari/537.36',
    
    // Chrome - macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.123 Safari/537.36',
    
    // Chrome - Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.123 Safari/537.36',
    
    // Firefox - Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
    
    // Firefox - macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    
    // Firefox - Linux
    'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    
    // Safari - macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    
    // Safari - iPad
    'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1',
    
    // Safari - iPhone
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1',
    
    // Edge - Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36 Edg/121.0.2277.88',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36 Edg/120.0.2210.91',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.123 Safari/537.36 Edg/119.0.2151.97',
    
    // Edge - macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36 Edg/121.0.2277.88',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36 Edg/120.0.2210.91',
    
    // Opera - Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36 OPR/107.0.4973.1296',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36 OPR/106.0.4998.1256',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.123 Safari/537.36 OPR/105.0.4970.1640',
    
    // Opera - macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36 OPR/107.0.4973.1296',
    
    // Brave - Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36',
    
    // Brave - macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36',
    
    // Vivaldi - Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Safari/537.36 Vivaldi/6.5.3206.51',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36 Vivaldi/6.4.3160.49',
    
    // Chrome Mobile - Android
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.123 Mobile Safari/537.36',
    
    // Firefox Mobile - Android
    'Mozilla/5.0 (Android; Mobile; rv:122.0) Gecko/122.0 Firefox/122.0',
    'Mozilla/5.0 (Android; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
    'Mozilla/5.0 (Android; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
    
    // Edge Mobile - Android
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Mobile Safari/537.36 EdgA/121.0.2277.99',
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Mobile Safari/537.36 EdgA/120.0.2210.99',
    
    // Opera Mobile - Android
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6309.127 Mobile Safari/537.36 OPR/79.2.4096.78121',
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Mobile Safari/537.36 OPR/78.2.4096.78134',
    
    // Chrome Additional Windows variants
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.149 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.187 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.4012.214 Safari/537.36'
  ]

  private static autoSwapInterval: NodeJS.Timeout | null = null

  /**
   * Get the current user agent based on stored settings
   */
  static getCurrentUserAgent(): string {
    const settings = storageService.getSettings()
    const uaSettings = settings?.userAgentSettings
    const index = uaSettings?.currentUserAgentIndex ?? 0
    return this.USER_AGENTS[Math.min(index, this.USER_AGENTS.length - 1)]
  }

  /**
   * Get the next user agent and rotate the index
   */
  static getNextUserAgent(): string {
    const settings = storageService.getSettings()
    let uaSettings = settings?.userAgentSettings || { currentUserAgentIndex: 0, autoSwapUserAgent: false, autoSwapIntervalMinutes: 30 }
    
    // Rotate to next index
    const nextIndex = (uaSettings.currentUserAgentIndex + 1) % this.USER_AGENTS.length
    
    // Update settings
    const updatedSettings = {
      ...settings,
      userAgentSettings: {
        ...uaSettings,
        currentUserAgentIndex: nextIndex
      }
    }
    
    storageService.setSettings(updatedSettings)
    
    return this.USER_AGENTS[nextIndex]
  }

  /**
   * Set user agent by index
   */
  static setUserAgentIndex(index: number): string {
    const validIndex = Math.max(0, Math.min(index, this.USER_AGENTS.length - 1))
    const settings = storageService.getSettings()
    
    const updatedSettings = {
      ...settings,
      userAgentSettings: {
        currentUserAgentIndex: validIndex,
        autoSwapUserAgent: settings?.userAgentSettings?.autoSwapUserAgent ?? false,
        autoSwapIntervalMinutes: settings?.userAgentSettings?.autoSwapIntervalMinutes ?? 30
      }
    }
    
    storageService.setSettings(updatedSettings)
    
    return this.USER_AGENTS[validIndex]
  }

  /**
   * Get all available user agents
   */
  static getAllUserAgents(): string[] {
    return [...this.USER_AGENTS]
  }

  /**
   * Get current user agent index
   */
  static getCurrentUserAgentIndex(): number {
    const settings = storageService.getSettings()
    return settings?.userAgentSettings?.currentUserAgentIndex ?? 0
  }

  /**
   * Start auto-swapping user agents at specified interval
   */
  static startAutoSwap(intervalMinutes: number = 30, onSwap?: (ua: string) => void): void {
    // Clear any existing interval
    if (this.autoSwapInterval) {
      clearInterval(this.autoSwapInterval)
    }

    // Update settings to enable auto-swap
    const settings = storageService.getSettings()
    const updatedSettings = {
      ...settings,
      userAgentSettings: {
        currentUserAgentIndex: settings?.userAgentSettings?.currentUserAgentIndex ?? 0,
        autoSwapUserAgent: true,
        autoSwapIntervalMinutes: intervalMinutes
      }
    }
    storageService.setSettings(updatedSettings)

    // Set up interval
    const intervalMs = intervalMinutes * 60 * 1000
    this.autoSwapInterval = setInterval(() => {
      const newUA = this.getNextUserAgent()
      console.log(`[UserAgentService] Auto-swapped user agent to index ${this.getCurrentUserAgentIndex()}`)
      onSwap?.(newUA)
    }, intervalMs)

    console.log(`[UserAgentService] Auto-swap started with ${intervalMinutes} minute interval`)
  }

  /**
   * Stop auto-swapping user agents
   */
  static stopAutoSwap(): void {
    if (this.autoSwapInterval) {
      clearInterval(this.autoSwapInterval)
      this.autoSwapInterval = null
    }

    // Update settings to disable auto-swap
    const settings = storageService.getSettings()
    const updatedSettings = {
      ...settings,
      userAgentSettings: {
        currentUserAgentIndex: settings?.userAgentSettings?.currentUserAgentIndex ?? 0,
        autoSwapUserAgent: false,
        autoSwapIntervalMinutes: settings?.userAgentSettings?.autoSwapIntervalMinutes ?? 30
      }
    }
    storageService.setSettings(updatedSettings)

    console.log('[UserAgentService] Auto-swap stopped')
  }

  /**
   * Check if auto-swap is enabled and resume if needed
   */
  static resumeAutoSwapIfEnabled(): void {
    const settings = storageService.getSettings()
    const uaSettings = settings?.userAgentSettings
    
    if (uaSettings?.autoSwapUserAgent) {
      this.startAutoSwap(uaSettings.autoSwapIntervalMinutes)
    }
  }

  /**
   * Get auto-swap status
   */
  static isAutoSwapEnabled(): boolean {
    const settings = storageService.getSettings()
    return settings?.userAgentSettings?.autoSwapUserAgent ?? false
  }

  /**
   * Get auto-swap interval
   */
  static getAutoSwapInterval(): number {
    const settings = storageService.getSettings()
    return settings?.userAgentSettings?.autoSwapIntervalMinutes ?? 30
  }
}
