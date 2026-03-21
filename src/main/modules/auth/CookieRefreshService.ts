import { RobloxUserService } from '../users/UserService'
import { RobloxAuthService } from './RobloxAuthService'
import { storageService } from '../system/StorageService'

/**
 * CookieRefreshService - Manages cookie validation and refreshing
 * 
 * Roblox cookies are server-controlled and will expire after inactivity.
 * This service periodically validates cookies and provides methods to:
 * 1. Check if a cookie is still valid
 * 2. Track last active time for accounts
 * 3. Warn users when cookies are about to expire (based on inactivity)
 */
export class CookieRefreshService {
  private validationCache: Map<string, { lastCheck: number; isValid: boolean }> = new Map()
  private cacheValidityMs = 1000 * 60 * 5 // 5 minute cache

  /**
   * Validate a cookie and update account's last active timestamp
   * Returns true if valid, false if expired/invalid
   */
  async validateAndRefresh(cookie: string): Promise<boolean> {
    // Safety check: never validate an empty or null cookie
    if (!cookie || cookie.trim().length === 0) {
      return false
    }

    try {
      // Check cache first
      const cacheKey = `cookie_${cookie.substring(0, 20)}`
      const cached = this.validationCache.get(cacheKey)
      if (cached && Date.now() - cached.lastCheck < this.cacheValidityMs) {
        return cached.isValid
      }

      // Validate with Roblox
      const user = await RobloxUserService.getAuthenticatedUser(cookie)
      
      if (user && user.id) {
        // Cookie is valid - update last active for this account
        this.updateAccountLastActive(user.id.toString(), cookie)
        
        // Cache result
        this.validationCache.set(cacheKey, {
          lastCheck: Date.now(),
          isValid: true
        })
        
        return true
      }

      return false
    } catch (error) {
      // Cache negative result
      const cacheKey = `cookie_${cookie.substring(0, 20)}`
      this.validationCache.set(cacheKey, {
        lastCheck: Date.now(),
        isValid: false
      })
      
      console.error('[CookieRefreshService] Cookie validation failed:', error)
      return false
    }
  }

  /**
   * Update account's last active timestamp
   * CRITICAL: Only update by exact account match, not by cookie to prevent
   * accidentally marking wrong account as active
   */
  private updateAccountLastActive(userId: string, cookie: string): void {
    try {
      const accounts = storageService.getAccounts() as any[]
      
      // SAFETY: Only update if userId matches exactly, ignore cookie key
      const updated = accounts.map(acc => {
        if (acc.userId === userId) {
          return {
            ...acc,
            lastActive: new Date().toISOString()
          }
        }
        return acc
      })
      
      if (JSON.stringify(accounts) !== JSON.stringify(updated)) {
        storageService.setAccounts(updated)
      }
    } catch (error) {
      console.error('[CookieRefreshService] Failed to update last active:', error)
    }
  }

  /**
   * Get inactivity duration in milliseconds since last active
   */
  getInactivityDuration(lastActive: string): number {
    if (!lastActive) return Infinity // Never active
    const lastActiveTime = new Date(lastActive).getTime()
    return Date.now() - lastActiveTime
  }

  /**
   * Check if account is likely to have expired based on inactivity
   * Roblox typically invalidates cookies after ~30 days of inactivity
   */
  isLikelyExpired(lastActive: string): boolean {
    const inactivityMs = this.getInactivityDuration(lastActive)
    const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30
    return inactivityMs > thirtyDaysMs
  }

  /**
   * Check if account is approaching expiration (warn users)
   * Returns days until likely expiration
   */
  daysUntilLikelyExpiration(lastActive: string): number {
    const inactivityMs = this.getInactivityDuration(lastActive)
    const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30
    const daysRemaining = (thirtyDaysMs - inactivityMs) / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.ceil(daysRemaining))
  }

  /**
   * Batch validate multiple cookies
   * Useful for checking account health on app startup
   */
  async validateBatch(cookies: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const cookie of cookies) {
      try {
        const isValid = await this.validateAndRefresh(cookie)
        results.set(cookie, isValid)
      } catch (error) {
        results.set(cookie, false)
      }
    }
    
    return results
  }

  /**
   * Get a fresh authentication ticket for a cookie
   * Use this before launching games to ensure the cookie is still valid
   */
  async getFreshTicket(cookie: string): Promise<string> {
    try {
      // Validate first
      const isValid = await this.validateAndRefresh(cookie)
      if (!isValid) {
        throw new Error('Cookie is no longer valid')
      }

      // Get fresh CSRF token and ticket
      const csrfToken = await RobloxAuthService.getCsrfToken(cookie)
      const ticket = await RobloxAuthService.getAuthenticationTicket(cookie, csrfToken)
      
      return ticket
    } catch (error: any) {
      throw new Error(`Failed to get fresh authentication ticket: ${error.message}`)
    }
  }

  /**
   * Clear validation cache (useful for testing or forcing revalidation)
   */
  clearCache(): void {
    this.validationCache.clear()
  }
}

export const cookieRefreshService = new CookieRefreshService()
