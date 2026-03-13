import { z } from 'zod'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  generateQuickLoginCode: () => invoke('generate-quick-login-code', S.quickLoginCodeSchema),
  checkQuickLoginStatus: (code: string, privateKey: string) =>
    invoke('check-quick-login-status', S.quickLoginStatusSchema, code, privateKey),
  completeQuickLogin: (code: string, privateKey: string) =>
    invoke('complete-quick-login', z.string(), code, privateKey),
  openRobloxLoginWindow: () => invoke('open-roblox-login-window', z.string()),
  openBrowserWithAccount: (accountId: string, url?: string) =>
    invoke('open-browser-with-account', z.void(), accountId, url),
  exportCookies: (accountIds: string[]) =>
    invoke('export-cookies', z.string(), accountIds)
}
