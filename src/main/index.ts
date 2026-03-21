/// <reference types="electron-vite/node" />
import { app, shell, BrowserWindow, ipcMain } from 'electron'
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

// Synchronous flag to prevent race condition - must be set before any async code
let handlersRegistered = false

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

  // Load CRITICAL modules first (needed before showing UI)
  const criticalModules = await Promise.all([
    import('./modules/core/RobloxHandler'),
    import('./modules/system/StorageController'),
    import('./modules/system/StorageService'),
    import('./modules/system/PinService'),
    import('./modules/updater/UpdaterController'),
    import('./modules/system/LogsController'),
    import('./modules/news/NewsController')
  ])

  const criticalLoaded = {
    registerRobloxHandlers: criticalModules[0].registerRobloxHandlers,
    registerStorageHandlers: criticalModules[1].registerStorageHandlers,
    storageService: criticalModules[2].storageService,
    pinService: criticalModules[3].pinService,
    registerUpdaterHandlers: criticalModules[4].registerUpdaterHandlers,
    registerLogsHandlers: criticalModules[5].registerLogsHandlers,
    registerNewsHandlers: criticalModules[6].registerNewsHandlers
  }

  // Update global reference
  storageService = criticalLoaded.storageService

  logPerf('critical-modules-loaded')

  // Register critical handlers
  criticalLoaded.registerRobloxHandlers()
  criticalLoaded.registerStorageHandlers()
  criticalLoaded.registerLogsHandlers()
  criticalLoaded.registerNewsHandlers()
  criticalLoaded.pinService.initialize()
  logPerf('critical-handlers-registered')

  // Resume user agent auto-swap if it was enabled
  const { UserAgentService } = await import('./modules/auth/UserAgentService')
  UserAgentService.resumeAutoSwapIfEnabled()

  // Register production module IPC handlers
  const { registerModuleIpcHandlers } = await import('./ipc/ModuleIpcHandlers')
  registerModuleIpcHandlers()

  // only navigate once the critical IPC handlers are in place to avoid race conditions
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Load NON-CRITICAL modules AFTER UI is displayed (deferred loading)
  mainWindow.once('ready-to-show', async () => {
    logPerf('ready-to-show')
    
    // Set flag SYNCHRONOUSLY to prevent both windows from registering handlers
    // This must be done before any async operations
    if (handlersRegistered) {
      console.log('[perf:main] Handlers already registered, skipping for this window')
      return
    }
    handlersRegistered = true
    console.log('[perf:main] Locked handler registration, proceeding with setup...')

    // Load and register non-critical modules in background
    console.log('[perf:main] Starting deferred module loading...')
    
    const nonCriticalModules = await Promise.all([
      import('./modules/discord/DiscordRPCController'),
      import('./modules/watcher/WatcherController'),
      import('./modules/macro/MacroController'),
      import('./modules/sniper/SniperController'),
      import('./modules/generator/GeneratorController'),
      import('./modules/proxy/ProxyController')
    ])

    const nonCriticalLoaded = {
      registerDiscordRPCHandlers: nonCriticalModules[0].registerDiscordRPCHandlers,
      registerWatcherHandlers: nonCriticalModules[1].registerWatcherHandlers,
      registerMacroHandlers: nonCriticalModules[2].registerMacroHandlers,
      registerSniperHandlers: nonCriticalModules[3].registerSniperHandlers,
      registerGeneratorHandlers: nonCriticalModules[4].registerGeneratorHandlers,
      registerProxyHandlers: nonCriticalModules[5].registerProxyHandlers
    }

    logPerf('non-critical-modules-loaded')

    // Register non-critical handlers
    console.log('[perf:main] Registering non-critical IPC handlers (one-time setup)...')
    nonCriticalLoaded.registerDiscordRPCHandlers()
    nonCriticalLoaded.registerWatcherHandlers(mainWindow)
    nonCriticalLoaded.registerMacroHandlers()
    nonCriticalLoaded.registerSniperHandlers()
    nonCriticalLoaded.registerGeneratorHandlers()
    nonCriticalLoaded.registerProxyHandlers()

    logPerf('non-critical-handlers-registered')
    console.log('[perf:main] App fully loaded and ready!')
  })

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

  // Get decrypted password for an account
  ipcMain.handle('account:get-decrypted-password', async (_event, accountId: string) => {
    try {
      if (!storageService) return { success: false, password: '' }
      const accounts = storageService.getAccounts()
      const account = accounts.find((acc) => acc.id === accountId)
      if (!account) {
        return { success: false, password: '' }
      }
      const decrypted = storageService.getDecryptedPassword(account.password)
      return { success: true, password: decrypted }
    } catch (err: any) {
      console.error('Error getting decrypted password:', err)
      return { success: false, password: '' }
    }
  })

  // DISABLED: License validation handler - licensing system disabled
  // ipcMain.handle('license:validate-stored', async () => { ... })


  // DISABLED: Periodic license session refresh - licensing system disabled
  // setInterval(async () => { ... }, 6 * 60 * 60 * 1000)

  // Register updater handlers
  criticalLoaded.registerUpdaterHandlers(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow()
      criticalLoaded.registerUpdaterHandlers(newWindow)
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
