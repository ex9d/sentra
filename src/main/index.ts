/// <reference types="electron-vite/node" />
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import KeyAuthWrapper from './lib/KeyAuthWrapper'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { getDataFile } from './utils/paths'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import iconIco from '../../resources/build/icons/win/icon.ico?asset'
import iconIcns from '../../resources/build/icons/mac/icon.icns?asset'

const mainStart = performance.now()
const logPerf = (label: string) => {
  const delta = performance.now() - mainStart
  console.log(`[perf:main] ${label} ${delta.toFixed(1)}ms`)
}

let storageService: typeof import('./modules/system/StorageService').storageService
let keyAuthClient: InstanceType<typeof KeyAuthWrapper> | null = null
let keyAuthSessionId: string | null = null
let keyAuthRetryTimer: NodeJS.Timeout | null = null
let keyAuthRetryCount = 0
const MAX_KEYAUTH_RETRIES = 3

// Prevent multiple instances of the app from running (Windows-only, but harmless on other platforms)
// This lock is essential for normal operation but can block app restart on Windows
// We store it so we can release it during updates if needed
let appLock: ReturnType<typeof app.requestSingleInstanceLock> | null = null
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  appLock = gotTheLock
}

// Export for use in other modules
export { keyAuthClient }

// Helper for gracefully handling app shutdown during updates
export function gracefulShutdownForUpdate(): void {
  if (appLock) {
    try {
      // Release the single instance lock to allow the updated app to start
      // Note: app.requestSingleInstanceLock() returns a lock object that is released by nullifying it
      appLock = null
    } catch (err) {
      console.warn('Could not release app lock:', err)
    }
  }
}

process.on('uncaughtException', (error) => {
  if (error.message === 'write EPIPE' || (error as any).code === 'EPIPE') return
  console.error('Uncaught exception:', error)
})

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === 'darwin' ? iconIcns : iconIco,
    backgroundColor: '#111111',
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : { titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff', height: 45 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Debounce window resize saving
  let resizeTimeout: NodeJS.Timeout | null = null
  mainWindow.on('resized', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (storageService) {
        const [width, height] = mainWindow.getSize()
        storageService.setWindowWidth(width)
        storageService.setWindowHeight(height)
      }
    }, 500)
  })

  mainWindow.on('ready-to-show', () => {
    // Apply saved size non-blocking
    if (storageService) {
      const savedWidth = storageService.getWindowWidth()
      const savedHeight = storageService.getWindowHeight()
      if (savedWidth && savedHeight) {
        mainWindow.setSize(savedWidth, savedHeight, true)
        mainWindow.center()
      }
    }
    mainWindow.show()
    logPerf('ready-to-show')
  })

  mainWindow.webContents.once('dom-ready', () => logPerf('dom-ready'))
  mainWindow.webContents.once('did-finish-load', () => logPerf('did-finish-load'))

  // Standardize console log output from renderer
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    // Electron passes arguments as: (event, level, message, line, sourceId)
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // navigation is deferred to caller so IPC handlers can be ready
  return mainWindow
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.sentra.app')
  if (process.platform === 'darwin') app.setName('sentra')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()
  logPerf('window-created')

  const loadModules = async () => {
    const modules = await Promise.all([
      import('./modules/core/RobloxHandler'),
      import('./modules/system/StorageController'),
      import('./modules/system/LogsController'),
      import('./modules/updater/UpdaterController'),
      import('./modules/news/NewsController'),
      import('./modules/system/StorageService'),
      import('./modules/system/PinService'),
      import('./modules/discord/DiscordRPCController'),
      import('./modules/watcher/WatcherController')
    ])

    return {
      registerRobloxHandlers: modules[0].registerRobloxHandlers,
      registerStorageHandlers: modules[1].registerStorageHandlers,
      registerLogsHandlers: modules[2].registerLogsHandlers,
      registerUpdaterHandlers: modules[3].registerUpdaterHandlers,
      registerNewsHandlers: modules[4].registerNewsHandlers,
      storageService: modules[5].storageService,
      pinService: modules[6].pinService,
      registerDiscordRPCHandlers: modules[7].registerDiscordRPCHandlers,
      registerWatcherHandlers: modules[8].registerWatcherHandlers
    }
  }

  const loadedModules = await loadModules()

  // Update global references
  storageService = loadedModules.storageService

  // Helper function to initialize KeyAuth with retry logic
  async function initializeKeyAuth(KEYAUTH_NAME: string, KEYAUTH_OWNERID: string, KEYAUTH_VERSION: string): Promise<boolean> {
    try {
      const tempClient = new KeyAuthWrapper({
        name: KEYAUTH_NAME,
        ownerid: KEYAUTH_OWNERID,
        version: KEYAUTH_VERSION,
        url: 'https://keyauth.win/api/1.3/'
      })

      console.log('[KeyAuth] Attempting initialization...')
      const initResult = await tempClient.init()
      if (!initResult.ok) {
        console.error('[KeyAuth] Init failed:', initResult.message, initResult.details)
        return false
      } else {
        keyAuthClient = tempClient
        keyAuthSessionId = (initResult.data as any)?.sessionid ?? null
        console.log('[KeyAuth] Successfully initialized, session:', keyAuthSessionId ? 'ok' : 'none')
        keyAuthRetryCount = 0
        return true
      }
    } catch (err) {
      console.error('[KeyAuth] Initialization error:', err)
      return false
    }
  }

  // Initialize KeyAuth client if environment variables are present
  try {
    let KEYAUTH_NAME = process.env.KEYAUTH_NAME
    let KEYAUTH_OWNERID = process.env.KEYAUTH_OWNERID
    let KEYAUTH_SECRET = process.env.KEYAUTH_SECRET
    let KEYAUTH_VERSION = process.env.KEYAUTH_VERSION

    // SECURITY: NEVER attempt to load secrets from stored config
    // KeyAuth credentials MUST come from environment variables only
    // This prevents plaintext storage of sensitive credentials

    // SECURITY: KeyAuth credentials MUST be provided via environment variables
    // Never hardcode credentials, especially KEYAUTH_SECRET. If credentials are missing,
    // the system will skip KeyAuth initialization to fail securely.
    if (!KEYAUTH_NAME || !KEYAUTH_OWNERID || !KEYAUTH_SECRET || !KEYAUTH_VERSION) {
      console.warn('[SECURITY] KeyAuth credentials not provided via environment variables. KeyAuth system disabled.')
      console.warn('[SECURITY] To enable KeyAuth, set KEYAUTH_NAME, KEYAUTH_OWNERID, KEYAUTH_SECRET, and KEYAUTH_VERSION environment variables.')
      keyAuthClient = null
      return
    }

    if (KEYAUTH_NAME && KEYAUTH_OWNERID && KEYAUTH_VERSION) {
      const initialized = await initializeKeyAuth(KEYAUTH_NAME, KEYAUTH_OWNERID, KEYAUTH_VERSION)
      
      // Set up retry timer if initialization failed
      if (!initialized) {
        console.log('[KeyAuth] Scheduling retry in 5 seconds...')
        keyAuthRetryTimer = setInterval(async () => {
          try {
            keyAuthRetryCount++
            if (keyAuthRetryCount > MAX_KEYAUTH_RETRIES) {
              console.warn(`[KeyAuth] Max retries (${MAX_KEYAUTH_RETRIES}) reached, giving up`)
              if (keyAuthRetryTimer) clearInterval(keyAuthRetryTimer)
              return
            }
            console.log(`[KeyAuth] Retry attempt ${keyAuthRetryCount}/${MAX_KEYAUTH_RETRIES}...`)
            const retrySuccess = await initializeKeyAuth(KEYAUTH_NAME, KEYAUTH_OWNERID, KEYAUTH_VERSION)
            if (retrySuccess && keyAuthRetryTimer) {
              clearInterval(keyAuthRetryTimer)
            }
          } catch (err) {
            console.error('[KeyAuth] Retry error:', err)
          }
        }, 5000)
      }
    } else {
      console.log('[KeyAuth] Environment variables not set; skipping initialization')
      keyAuthClient = null
    }
  } catch (err) {
    console.error('[KeyAuth] Failed to initialize:', err)
    keyAuthClient = null
  }

  logPerf('modules-loaded')

  // Register handlers
  loadedModules.registerRobloxHandlers()
  loadedModules.registerStorageHandlers()
  loadedModules.registerLogsHandlers()
  loadedModules.registerNewsHandlers()
  loadedModules.registerDiscordRPCHandlers()
  loadedModules.registerWatcherHandlers(mainWindow)
  loadedModules.pinService.initialize()

  logPerf('handlers-registered')

  // only navigate once the IPC handlers are in place to avoid race conditions
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  ipcMain.handle('focus-window', () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(false)
    }
  })

  ipcMain.handle('has-config', () => {
    try {
      const configPath = getDataFile('config.json')
      if (!existsSync(configPath)) return false
      const configData = JSON.parse(readFileSync(configPath, 'utf-8'))
      // Check if config exists and has PIN hash (onboarding completed)
      return !!(configData.settings && configData.settings.pinCodeHash)
    } catch (error) {
      console.error('Failed to check config existence:', error)
      return false
    }
  })

  // DISABLED: License redeem handler - licensing system disabled
  // ipcMain.handle('license:redeem', async (_event, licenseKey: string, userPin: string) => { ... })

  // IPC: Reset HWID / clear license
  // Note: reset-hwid removed — functionality requires KeyAuth subscription. Do not expose.

  // IPC: Logout / clear all config data
  ipcMain.handle('app:logout', async () => {
    try {
      if (!storageService) return { success: false, message: 'Storage not initialized' }
      storageService.clearAll()
      return { success: true, message: null }
    } catch (err: any) {
      return { success: false, message: err?.message ?? String(err) }
    }
  })

  // DISABLED: License validation handler - licensing system disabled
  // ipcMain.handle('license:validate-stored', async () => { ... })


  // DISABLED: Periodic license session refresh - licensing system disabled
  // setInterval(async () => { ... }, 6 * 60 * 60 * 1000)

  loadedModules.registerUpdaterHandlers(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow()
      loadedModules.registerUpdaterHandlers(newWindow)
    } else {
      // If windows exist, just focus the first one
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // Handle second instance attempt on Windows
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
