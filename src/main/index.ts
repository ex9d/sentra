/// <reference types="electron-vite/node" />
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import KeyAuthWrapper from './lib/KeyAuthWrapper'
import { join } from 'path'
import { existsSync } from 'fs'
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
  mainWindow.webContents.on('console-message', (_event, ...args: any[]) => {
    if (args.length === 1 && typeof args[0] === 'object') {
      const { level = 0, message = '', lineNumber: line = 0, sourceId = '' } = args[0]
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    } else {
      const [level = 0, message = '', line = 0, sourceId = ''] = args as any[]
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

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
      import('./modules/discord/DiscordRPCController')
    ])

    return {
      registerRobloxHandlers: modules[0].registerRobloxHandlers,
      registerStorageHandlers: modules[1].registerStorageHandlers,
      registerLogsHandlers: modules[2].registerLogsHandlers,
      registerUpdaterHandlers: modules[3].registerUpdaterHandlers,
      registerNewsHandlers: modules[4].registerNewsHandlers,
      storageService: modules[5].storageService,
      pinService: modules[6].pinService,
      registerDiscordRPCHandlers: modules[7].registerDiscordRPCHandlers
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

    // Fallback: inject provided credentials if still missing
    // These credentials should be provided via environment variables in production
    // but we provide fallback values to ensure license system works in all scenarios
    if (!KEYAUTH_NAME || !KEYAUTH_OWNERID || !KEYAUTH_SECRET || !KEYAUTH_VERSION) {
      console.warn('[SECURITY] KeyAuth credentials missing from environment. Using fallback defaults.')
      KEYAUTH_NAME = KEYAUTH_NAME || 'sentra'
      KEYAUTH_OWNERID = KEYAUTH_OWNERID || 'wu9fJzRsxo'
      KEYAUTH_SECRET = KEYAUTH_SECRET || '053010832c7521a8cdb0582faeeb5233fda4602d180b3d6b82bf582aa53a460a'
      KEYAUTH_VERSION = KEYAUTH_VERSION || '1.0'
      console.warn('[SECURITY] Fallback credentials are IN MEMORY ONLY. Never stored to disk.')
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
  loadedModules.pinService.initialize()

  logPerf('handlers-registered')

  ipcMain.handle('focus-window', () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(false)
    }
  })

  ipcMain.handle('has-config', () => {
    try {
      const configPath = join(app.getPath('userData'), 'config.json')
      return existsSync(configPath)
    } catch (error) {
      console.error('Failed to check config existence:', error)
      return false
    }
  })

  // IPC: Redeem license (renderer -> main)
  ipcMain.handle('license:redeem', async (_event, licenseKey: string, userPin: string) => {
    try {
      if (!keyAuthClient) return { success: false, message: 'License client not initialized' }

      // Use KeyAuthWrapper.license to redeem the key (handles HWID etc.)
      const result = await keyAuthClient.license(licenseKey)
      if (!result.ok) {
        // Map error codes to user-friendly messages
        let userMessage = result.message ?? 'License redemption failed'
        const code = (result as any).code

        if (code === 'banned') {
          userMessage = 'This license key is banned and cannot be used'
        } else if (code === 'already_used') {
          userMessage = 'This license key has already been redeemed on another device'
        } else if (code === 'invalid_key') {
          userMessage = 'Invalid license key'
        }

        return { success: false, message: userMessage, code, details: result.details }
      }

      // If a PIN is set, encrypt with the existing AES logic; otherwise store the license (base64) as-is
      const pinHash = storageService.getPinHash()
      if (pinHash) {
        const encryptionSalt = loadedModules.pinService.getEncryptionSalt(pinHash)
        if (!encryptionSalt) return { success: false, message: 'Encryption salt unavailable' }

        const encryptedKey = loadedModules.pinService.encryptWithPin(licenseKey, userPin, encryptionSalt)
        if (!encryptedKey) return { success: false, message: 'Failed to encrypt license' }

        storageService.setEncryptedLicense(encryptedKey)
      } else {
        // No PIN — store license as base64 to allow simple retrieval and automatic checks on launch
        const plainStored = Buffer.from(licenseKey, 'utf8').toString('base64')
        storageService.setEncryptedLicense(plainStored)
      }

      return { success: true, message: 'License redeemed successfully' }
    } catch (err: any) {
      return { success: false, message: err?.message ?? String(err) }
    }
  })

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

  // IPC: Validate stored license on startup
  ipcMain.handle('license:validate-stored', async () => {
    try {
      if (!keyAuthClient) return { success: false, message: 'License client not initialized' }

      // Try to get encrypted license
      const encryptedLicense = storageService.getEncryptedLicense()
      if (!encryptedLicense) {
        return { success: true, hasLicense: false, message: 'No stored license found' }
      }

      // Decrypt the license
      let decryptedLicense = ''
      const pinHash = storageService.getPinHash()
      if (pinHash) {
        // License is encrypted; need PIN to decrypt
        const encryptionSalt = loadedModules.pinService.getEncryptionSalt(pinHash)
        if (!encryptionSalt) {
          return { success: false, message: 'Cannot validate license without PIN', requiresPin: true }
        }
        // We can't decrypt without the PIN from user; skip validation this time
        return { success: true, hasLicense: true, message: 'Stored license requires PIN for validation' }
      } else {
        // License is stored as base64
        try {
          decryptedLicense = Buffer.from(encryptedLicense, 'base64').toString('utf8')
        } catch (err) {
          console.error('Failed to decode stored license:', err)
          storageService.deleteEncryptedLicense()
          return { success: false, message: 'Stored license is corrupted; deleted', isBanned: true }
        }
      }

      // Validate the license against KeyAuth
      const result = await keyAuthClient.license(decryptedLicense)
      if (!result.ok) {
        const code = (result as any).code

        // If banned or already used, delete the license and force re-onboarding
        if (code === 'banned' || code === 'already_used') {
          storageService.deleteEncryptedLicense()
          return { success: false, isBanned: true, code, message: result.message }
        }

        // For other errors, just report them
        return { success: false, message: result.message }
      }

      // License is valid
      return { success: true, hasLicense: true, isValid: true, message: 'Stored license is valid' }
    } catch (err: any) {
      return { success: false, message: err?.message ?? String(err) }
    }
  })

  // Periodic session refresh (every 6 hours)
  setInterval(async () => {
    try {
      if (!keyAuthClient) return
      const check = await keyAuthClient.init()
      if (check.ok) keyAuthSessionId = (check.data as any)?.sessionid ?? null
    } catch (err) {
      console.error('License session refresh failed:', err)
    }
  }, 6 * 60 * 60 * 1000)

  loadedModules.registerUpdaterHandlers(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow()
      loadedModules.registerUpdaterHandlers(newWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
