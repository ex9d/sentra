import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Import consolidated API domains
import {
  accountApi,
  usersApi,
  friendsApi,
  avatarApi,
  inventoryApi,
  catalogApi,
  catalogDatabaseApi,
  gamesApi,
  groupsApi,
  systemApi,
  licenseApi,
  appApi,
  pinApi,
  installApi,
  netlogApi,
  catalogDbApi,
  authApi,
  rolimonsApi,
  transactionsApi,
  updaterApi,
  newsApi,
  accountSettingsApi,
  discordRPCApi,
  watcherApi,
  macroApi,
  sniperApi,
  generatorApi,
  proxyApi
} from './api'

// Platform info
const platform = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  platform: process.platform
}

// Merge all domain APIs into a single api object
const api = {
  ...appApi,
  ...accountApi,
  ...authApi,
  ...avatarApi,
  ...catalogApi,
  ...catalogDatabaseApi,
  ...catalogDbApi,
  ...friendsApi,
  ...gamesApi,
  ...groupsApi,
  ...inventoryApi,
  ...usersApi,
  ...systemApi,
  ...licenseApi,
  ...pinApi,
  ...installApi,
  ...rolimonsApi,
  ...netlogApi,
  ...transactionsApi,
  ...updaterApi,
  ...newsApi,
  ...accountSettingsApi,
  ...discordRPCApi,
  ...watcherApi,
  ...macroApi,
  ...sniperApi,
  ...generatorApi,
  ...proxyApi,
  // Namespace properties for organized access
  news: newsApi,
  account: accountApi,
  user: usersApi,
  friends: friendsApi,
  avatar: avatarApi,
  inventory: inventoryApi,
  catalog: catalogApi,
  games: gamesApi,
  groups: groupsApi,
  system: systemApi,
  transactions: transactionsApi,
  updater: updaterApi,
  settings: accountSettingsApi,
  discord: discordRPCApi,
  watcher: watcherApi,
  macro: macroApi,
  sniper: sniperApi,
  generator: generatorApi,
  proxy: proxyApi
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('platform', platform)
  } catch (error) {
    console.error('Failed to expose APIs via contextBridge:', error)
  }
} else {
  // In non-context-isolated mode, assign directly to window
  ;(window as any).electron = electronAPI
  ;(window as any).api = api
  ;(window as any).platform = platform
}
