import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from './RobloxAuthService'
import { RobloxUserService } from '../users/UserService'
import { RobloxLoginWindowService } from './RobloxLoginWindowService'
import { storageService } from '../system/StorageService'

/**
 * Registers authentication-related IPC handlers
 */
export const registerAuthHandlers = (): void => {
  handle('validate-cookie', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    RobloxAuthService.validateCookieFormat(cookie)

    const userData = await RobloxUserService.getAuthenticatedUser(cookie)
    return userData
  })

  handle('generate-quick-login-code', z.tuple([]), async () => {
    return RobloxAuthService.generateQuickLoginCode()
  })

  handle(
    'check-quick-login-status',
    z.tuple([z.string(), z.string()]),
    async (_, code, privateKey) => {
      return RobloxAuthService.checkQuickLoginStatus(code, privateKey)
    }
  )

  handle('complete-quick-login', z.tuple([z.string(), z.string()]), async (_, code, privateKey) => {
    return RobloxAuthService.completeQuickLogin(code, privateKey)
  })

  handle('open-roblox-login-window', z.tuple([]), async () => {
    return RobloxLoginWindowService.openLoginWindow()
  })

  handle('open-browser-with-account', z.tuple([z.string(), z.string().optional()]), async (_, accountId, url) => {
    const accounts = storageService.getAccounts()
    const account = accounts.find((a) => a.id === accountId)
    
    if (!account || !account.cookie) {
      throw new Error('Account not found or cookie unavailable')
    }

    const settings = storageService.getSettings()
    const windowWidth = settings.browserWindowWidth
    const windowHeight = settings.browserWindowHeight
    const finalUrl = url || 'https://www.roblox.com/home'
    
    await RobloxLoginWindowService.openBrowserWithAccount(account.cookie, finalUrl, windowWidth ?? undefined, windowHeight ?? undefined)
  })

  handle('export-cookies', z.tuple([z.array(z.string())]), async (_, accountIds) => {
    const accounts = storageService.getAccounts()
    const cookies = accountIds
      .map((id) => accounts.find((a) => a.id === id)?.cookie)
      .filter((cookie): cookie is string => !!cookie)
    
    return cookies.join('\n')
  })
}
