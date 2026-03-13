import { z } from 'zod'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// SYSTEM API
// ============================================================================

export const systemApi = {
  // Window control
  focusWindow: () => invoke('focus-window', z.void()),
  hasConfig: () => invoke('has-config', z.boolean()),

  // Sidebar settings
  getSidebarWidth: () => invoke('get-sidebar-width', z.number().optional()),
  setSidebarWidth: (width: number) => invoke('set-sidebar-width', z.void(), width),
  getSidebarCollapsed: () => invoke('get-sidebar-collapsed', z.boolean()),
  setSidebarCollapsed: (collapsed: boolean) => invoke('set-sidebar-collapsed', z.void(), collapsed),

  // Avatar render settings
  getAvatarRenderWidth: () => invoke('get-avatar-render-width', z.number().optional()),
  setAvatarRenderWidth: (width: number) => invoke('set-avatar-render-width', z.void(), width),

  // Accounts view settings
  getAccountsViewMode: () => invoke('get-accounts-view-mode', z.enum(['list', 'grid'])),
  setAccountsViewMode: (mode: 'list' | 'grid') => invoke('set-accounts-view-mode', z.void(), mode),

  // Favorites
  getFavoriteGames: () => invoke('get-favorite-games', z.array(z.string())),
  addFavoriteGame: (placeId: string) => invoke('add-favorite-game', z.void(), placeId),
  removeFavoriteGame: (placeId: string) => invoke('remove-favorite-game', z.void(), placeId),
  getFavoriteItems: () => invoke('get-favorite-items', z.array(S.favoriteItemSchema)),
  addFavoriteItem: (item: { id: number; name: string; type: string }) =>
    invoke('add-favorite-item', z.void(), item),
  removeFavoriteItem: (itemId: number) => invoke('remove-favorite-item', z.void(), itemId),

  // Settings
  getSettings: () => invoke('get-settings', S.settingsSchema),
  // Sanitize settings before sending to main process to avoid IPC validation
  // failures when the running main process uses stale compiled schemas.
  setSettings: (settings: unknown) => {
    try {
      const outgoing: any = settings && typeof settings === 'object' ? { ...(settings as any) } : settings

      // Normalize `tint` to values the running main process currently accepts.
      // If the main is still on the old enum, it likely only accepts ['neutral','cool'].
      if (outgoing && typeof outgoing === 'object' && 'tint' in outgoing) {
        const allowed = ['neutral', 'cool']
        const t = String(outgoing.tint)
        if (!allowed.includes(t)) {
          const map: Record<string, string> = {
            warm: 'neutral',
            forest: 'neutral',
            twilight: 'cool',
            default: 'neutral'
          }
          outgoing.tint = map[t] ?? 'neutral'
        }
      }

      return invoke('set-settings', z.void(), outgoing)
    } catch (err) {
      console.error('Error during tint sanitization in setSettings:', err)
      // Fallback to direct send if something unexpected occurs
      return invoke('set-settings', z.void(), settings)
    }
  },

  // Game server settings
  getExcludeFullGames: () => invoke('get-exclude-full-games', z.boolean()),
  setExcludeFullGames: (excludeFullGames: boolean) =>
    invoke('set-exclude-full-games', z.void(), excludeFullGames),

  // Logs
  getLogs: () => invoke('get-logs', z.array(S.logMetadataSchema)),
  getLogContent: (filename: string) => invoke('get-log-content', z.string(), filename),
  deleteLog: (filename: string) => invoke('delete-log', z.boolean(), filename),
  deleteAllLogs: () => invoke('delete-all-logs', z.boolean()),
  openLogFile: (filename: string) => invoke('open-log-file', z.boolean(), filename),

  // Updates
  getDeployHistory: (force?: boolean) => invoke('get-deploy-history', S.deployHistorySchema, force || false),
  checkForUpdates: (binaryType: string, currentVersionHash: string) =>
    invoke('check-for-updates', S.updateCheckSchema, binaryType, currentVersionHash),

  // Custom Fonts
  getCustomFonts: () =>
    invoke('get-custom-fonts', z.array(z.object({ family: z.string(), url: z.string() }))),
  addCustomFont: (font: { family: string; url: string }) =>
    invoke('add-custom-font', z.void(), font),
  removeCustomFont: (family: string) => invoke('remove-custom-font', z.void(), family),
  getActiveFont: () => invoke('get-active-font', z.string().nullable()),
  setActiveFont: (family: string | null) => invoke('set-active-font', z.void(), family),

  // Asset paths
  getAssetPath: (assetPath: string) => invoke('get-asset-path', z.string(), assetPath),

  // Roblox Settings
  getRobloxSettings: () =>
    invoke(
      'get-roblox-settings',
      z.object({
        allowMultipleLaunches: z.boolean(),
        defaultPhysicsEngine: z.enum(['Terrain', 'Legacy']),
        enableOptimizations: z.boolean(),
        memoryLimit: z.number(),
        useDirectX12: z.boolean(),
        lowEndGraphics: z.boolean(),
        disableDualChannelAudio: z.boolean()
      })
    ),
  setRobloxSettings: (settings: {
    allowMultipleLaunches?: boolean
    defaultPhysicsEngine?: 'Terrain' | 'Legacy'
    enableOptimizations?: boolean
    memoryLimit?: number
    useDirectX12?: boolean
    lowEndGraphics?: boolean
    disableDualChannelAudio?: boolean
  }) => invoke('set-roblox-settings', z.void(), settings),

  // Multiple instances setting
  getAllowMultipleInstances: () => invoke('get-allow-multiple-instances', z.boolean()),
  setAllowMultipleInstances: (allow: boolean) => invoke('set-allow-multiple-instances', z.void(), allow)
}

// ============================================================================
// LICENSE API - DISABLED
// ============================================================================
// Licensing system disabled; APIs commented out
// export const licenseApi = {
//   redeemLicense: (licenseKey: string, userPin?: string) => ...,
//   validateStoredLicense: () => ...,
//   checkAdminStatus: () => ...
// }

export const licenseApi = {}

// ============================================================================
// APP API
// ============================================================================

export const appApi = {
  logout: () =>
    invoke(
      'app:logout',
      z.object({ success: z.boolean(), message: z.string().nullable().optional() })
    )
}

// ============================================================================
// PIN API
// ============================================================================

export const pinApi = {
  verifyPin: (pin: string) => invoke('verify-pin', S.pinVerifyResultSchema, pin),
  isPinVerified: () => invoke('is-pin-verified', z.boolean()),
  setPin: (newPin: string | null, currentPin?: string) =>
    invoke('set-pin', S.pinSetResultSchema, { newPin, currentPin }),
  getPinLockoutStatus: () => invoke('get-pin-lockout-status', S.pinLockoutStatusSchema)
}

// ============================================================================
// INSTALL API
// ============================================================================

export const installApi = {
  installRobloxVersion: (binaryType: string, version: string, installPath: string) =>
    invoke('install-roblox-version', z.string().nullable(), binaryType, version, installPath),
  launchRobloxInstall: (installPath: string) =>
    invoke('launch-roblox-install', z.void(), installPath),
  uninstallRobloxVersion: (installPath: string) =>
    invoke('uninstall-roblox-version', z.void(), installPath),
  openRobloxFolder: (installPath: string) => invoke('open-roblox-folder', z.void(), installPath),
  verifyRobloxFiles: (binaryType: string, version: string, installPath: string) =>
    invoke('verify-roblox-files', z.boolean(), binaryType, version, installPath),
  getFFlags: (installPath: string) => invoke('get-fflags', S.fflagsSchema, installPath),
  setFFlags: (installPath: string, flags: unknown) =>
    invoke('set-fflags', z.void(), installPath, flags),
  setActiveInstall: (installPath: string) => invoke('set-active-install', z.void(), installPath),
  removeActiveInstall: () => invoke('remove-active-install', z.void()),
  getActiveInstallPath: () => invoke('get-active-install-path', z.string().nullable()),
  detectDefaultInstallations: () =>
    invoke('detect-default-installations', S.detectedInstallationsSchema),
  installFont: (installPath: string, fontPath: string) =>
    invoke('install-font', z.void(), installPath, fontPath),
  installCursor: (installPath: string, cursorPath: string) =>
    invoke('install-cursor', z.void(), installPath, cursorPath),
  runSpoofer: () => invoke('run-spoofer', z.void()),
  createBackup: (accounts: unknown[], backupPin: string, savePath?: string) =>
    invoke('create-backup', z.string(), accounts, backupPin, savePath),
  restoreBackup: (filepath: string, backupPin: string) =>
    invoke('restore-backup', z.array(z.unknown()), filepath, backupPin),
  selectInstallationDirectory: () => invoke('select-installation-directory', z.string()),
  pickBackupFile: () => invoke('pick-backup-file', z.string()),
  chooseBackupLocation: () => invoke('choose-backup-location', z.string())
}

// ============================================================================
// NET-LOG API
// ============================================================================

export const netlogApi = {
  getNetLogStatus: () => invoke('net-log:get-status', S.netLogStatusSchema),
  getNetLogPath: () => invoke('net-log:get-log-path', z.string()),
  stopNetLog: () => invoke('net-log:stop', S.netLogStopResponseSchema),
  startNetLog: () => invoke('net-log:start', S.netLogStartResponseSchema)
}

// ============================================================================
// CATALOG DATABASE API
// ============================================================================

export const catalogDbApi = {
  getStatus: () => invoke('get-catalog-db-status', S.catalogDbStatusSchema),
  download: () => invoke('download-catalog-db', S.catalogDbDownloadResultSchema)
}
