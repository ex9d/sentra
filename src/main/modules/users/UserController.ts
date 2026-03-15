import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from './UserService'
import { cookieRefreshService } from '../auth/CookieRefreshService'

/**
 * Registers user-related IPC handlers
 */
export const registerUserHandlers = (): void => {
  handle('get-avatar-url', z.tuple([z.string()]), async (_, userId) => {
    return RobloxUserService.getAvatarUrl(userId)
  })

  // ============================================================================
  // COOKIE VALIDATION & REFRESH HANDLERS
  // ============================================================================

  handle('validate-refresh-cookie', z.tuple([z.string()]), async (_, cookieRaw) => {
    try {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      const isValid = await cookieRefreshService.validateAndRefresh(cookie)
      return {
        success: isValid,
        message: isValid ? 'Cookie is valid' : 'Cookie is expired or invalid'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to validate cookie'
      }
    }
  })

  handle('get-cookie-health', z.tuple([z.string()]), async (_, cookieRaw) => {
    try {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      
      // Get account info to check lastActive
      const user = await RobloxUserService.getAuthenticatedUser(cookie)
      const accounts = (await (global as any)._getAccounts?.()) || []
      const account = accounts.find((a: any) => a.userId === user.id.toString())
      
      const lastActive = account?.lastActive || new Date().toISOString()
      const isExpiring = cookieRefreshService.isLikelyExpired(lastActive)
      const daysUntil = cookieRefreshService.daysUntilLikelyExpiration(lastActive)
      
      return {
        isValid: !isExpiring,
        isExpiring: daysUntil < 7 && !isExpiring, // Warn at 7 days
        daysUntilExpiry: daysUntil,
        lastValidated: new Date().toISOString()
      }
    } catch {
      return {
        isValid: false,
        isExpiring: true,
        daysUntilExpiry: 0,
        lastValidated: new Date().toISOString()
      }
    }
  })

  handle(
    'get-batch-user-avatars',
    z.tuple([z.array(z.number()), z.string().optional(), z.string().optional()]),
    async (_, userIds, size, cookie) => {
      const resultMap = await RobloxUserService.getBatchUserAvatarHeadshots(
        userIds,
        size || '420x420',
        cookie
      )
      const resultObj: Record<number, string | null> = {}
      for (const [userId, url] of resultMap.entries()) {
        resultObj[userId] = url
      }
      return resultObj
    }
  )

  handle('get-asset-content', z.tuple([z.string()]), async (_, url) => {
    return RobloxUserService.getAssetContent(url)
  })

  handle('fetch-account-stats', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)
    return RobloxUserService.getAccountStats(cookie, authData.id)
  })

  handle('get-account-status', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)
    return RobloxUserService.getPresence(cookie, authData.id)
  })

  handle('get-voice-settings', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getVoiceSettings(cookie)
  })

  handle('get-batch-account-statuses', z.tuple([z.array(z.string())]), async (_, cookieRaws) => {
    // Extract cookies for the service, but keep original cookies for the result keys
    const cookieMap = new Map<string, string>()
    const extractedCookies: string[] = []

    for (const cookieRaw of cookieRaws) {
      const extracted = RobloxAuthService.extractCookie(cookieRaw)
      cookieMap.set(cookieRaw, extracted)
      extractedCookies.push(extracted)
    }

    const results = await RobloxUserService.getBatchAccountStatuses(extractedCookies)

    const resultObj: Record<string, { userId: number; presence: any } | null> = {}
    for (const [originalCookie] of cookieMap.entries()) {
      const extractedCookie = cookieMap.get(originalCookie)!
      const data = results.get(extractedCookie) || null
      resultObj[originalCookie] = data
    }
    return resultObj
  })

  handle(
    'get-friends-statuses',
    z.tuple([z.string(), z.array(z.number())]),
    async (_, cookieRaw, userIds) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxUserService.getBatchPresences(cookie, userIds)
    }
  )

  handle('get-user-presence', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPresence(cookie, userId)
  })

  handle('get-user-by-username', z.tuple([z.string()]), async (_, username) => {
    return RobloxUserService.getUserByUsername(username)
  })

  handle('get-avatar-url-by-username', z.tuple([z.string()]), async (_, username) => {
    try {
      const user = await RobloxUserService.getUserByUsername(username)
      if (!user) {
        return { success: false, url: '' }
      }
      const avatarUrl = await RobloxUserService.getAvatarUrl(user.id)
      return { success: true, url: avatarUrl }
    } catch (err) {
      console.error('[UserController] Failed to get avatar URL for username:', username, err)
      return { success: false, url: '' }
    }
  })

  handle(
    'get-user-details-extended',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, userId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxUserService.getExtendedUserDetails(cookie, userId)
    }
  )

  handle('get-user-groups', z.tuple([z.number()]), async (_, userId) => {
    return RobloxUserService.getUserGroups(userId)
  })

  handle('get-batch-user-details', z.tuple([z.array(z.number())]), async (_, userIds) => {
    const resultMap = await RobloxUserService.getBatchUserDetails(userIds)
    const resultObj: Record<number, { id: number; name: string; displayName: string } | null> = {}
    for (const [userId, details] of resultMap.entries()) {
      resultObj[userId] = details
    }
    return resultObj
  })

  handle('get-detailed-stats', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getDetailedStats(cookie, userId)
  })

  handle('get-roblox-badges', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getRobloxBadges(cookie, userId)
  })

  handle('get-player-badges', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPlayerBadges(cookie, userId)
  })

  handle('get-past-usernames', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPastUsernames(cookie, userId)
  })

  handle('block-user', z.tuple([z.string(), z.number()]), async (_, cookieRaw, targetUserId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.blockUser(cookie, targetUserId)
  })

  handle('get-user-profile', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getUserProfile(cookie, userId)
  })
}
