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

  // KeyAuth completely removed
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
