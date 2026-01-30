import { z } from 'zod'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'





export const systemApi = {

  focusWindow: () => invoke('focus-window', z.void()),
  hasConfig: () => invoke('has-config', z.boolean()),


  getSidebarWidth: () => invoke('get-sidebar-width', z.number().optional()),
  setSidebarWidth: (width: number) => invoke('set-sidebar-width', z.void(), width),
  getSidebarCollapsed: () => invoke('get-sidebar-collapsed', z.boolean()),
  setSidebarCollapsed: (collapsed: boolean) => invoke('set-sidebar-collapsed', z.void(), collapsed),


  getAvatarRenderWidth: () => invoke('get-avatar-render-width', z.number().optional()),
  setAvatarRenderWidth: (width: number) => invoke('set-avatar-render-width', z.void(), width),


  getAccountsViewMode: () => invoke('get-accounts-view-mode', z.enum(['list', 'grid'])),
  setAccountsViewMode: (mode: 'list' | 'grid') => invoke('set-accounts-view-mode', z.void(), mode),


  getFavoriteGames: () => invoke('get-favorite-games', z.array(z.string())),
  addFavoriteGame: (placeId: string) => invoke('add-favorite-game', z.void(), placeId),
  removeFavoriteGame: (placeId: string) => invoke('remove-favorite-game', z.void(), placeId),
  getFavoriteItems: () => invoke('get-favorite-items', z.array(S.favoriteItemSchema)),
  addFavoriteItem: (item: { id: number; name: string; type: string }) =>
    invoke('add-favorite-item', z.void(), item),
  removeFavoriteItem: (itemId: number) => invoke('remove-favorite-item', z.void(), itemId),


  getSettings: () => invoke('get-settings', S.settingsSchema),
  setSettings: (settings: unknown) => invoke('set-settings', z.void(), settings),


  getExcludeFullGames: () => invoke('get-exclude-full-games', z.boolean()),
  setExcludeFullGames: (excludeFullGames: boolean) =>
    invoke('set-exclude-full-games', z.void(), excludeFullGames),


  getLogs: () => invoke('get-logs', z.array(S.logMetadataSchema)),
  getLogContent: (filename: string) => invoke('get-log-content', z.string(), filename),
  deleteLog: (filename: string) => invoke('delete-log', z.boolean(), filename),
  deleteAllLogs: () => invoke('delete-all-logs', z.boolean()),
  openLogFile: (filename: string) => invoke('open-log-file', z.boolean(), filename),


  getDeployHistory: () => invoke('get-deploy-history', S.deployHistorySchema),
  checkForUpdates: (binaryType: string, currentVersionHash: string) =>
    invoke('check-for-updates', S.updateCheckSchema, binaryType, currentVersionHash),


  getCustomFonts: () =>
    invoke('get-custom-fonts', z.array(z.object({ family: z.string(), url: z.string() }))),
  addCustomFont: (font: { family: string; url: string }) =>
    invoke('add-custom-font', z.void(), font),
  removeCustomFont: (family: string) => invoke('remove-custom-font', z.void(), family),
  getActiveFont: () => invoke('get-active-font', z.string().nullable()),
  setActiveFont: (family: string | null) => invoke('set-active-font', z.void(), family)
}





export const pinApi = {
  verifyPin: (pin: string) => invoke('verify-pin', S.pinVerifyResultSchema, pin),
  isPinVerified: () => invoke('is-pin-verified', z.boolean()),
  setPin: (newPin: string | null, currentPin?: string) =>
    invoke('set-pin', S.pinSetResultSchema, { newPin, currentPin }),
  getPinLockoutStatus: () => invoke('get-pin-lockout-status', S.pinLockoutStatusSchema)
}





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
  createBackup: (accounts: unknown[], backupPin: string) =>
    invoke('create-backup', z.string(), accounts, backupPin),
  restoreBackup: (filepath: string, backupPin: string) =>
    invoke('restore-backup', z.array(z.unknown()), filepath, backupPin),
  pickBackupFile: () => invoke('pick-backup-file', z.string())
}





export const netlogApi = {
  getNetLogStatus: () => invoke('net-log:get-status', S.netLogStatusSchema),
  getNetLogPath: () => invoke('net-log:get-log-path', z.string()),
  stopNetLog: () => invoke('net-log:stop', S.netLogStopResponseSchema),
  startNetLog: () => invoke('net-log:start', S.netLogStartResponseSchema)
}





export const catalogDbApi = {
  getStatus: () => invoke('get-catalog-db-status', S.catalogDbStatusSchema),
  download: () => invoke('download-catalog-db', S.catalogDbDownloadResultSchema)
}