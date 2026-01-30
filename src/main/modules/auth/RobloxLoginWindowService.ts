import { BrowserWindow, BrowserWindowConstructorOptions, session, shell } from 'electron'
import type { Cookie, Event as ElectronEvent } from 'electron'

export class RobloxLoginWindowService {
  private static readonly PARTITION = 'persist:roblox-login'
  private static readonly ROBLOX_LOGIN_URL = 'https://www.roblox.com/login'
  private static readonly PERMITTED_PERMISSIONS = new Set<string>([
    'clipboard-read',
    'display-capture',
    'fullscreen',
    'hid',
    'idle-detection',
    'media',
    'mediaKeySystem',
    'notifications',
    'pointerLock',
    'serial',
    'usb'
  ])

  private static loginWindow: BrowserWindow | null = null
  private static pendingPromise: Promise<string> | null = null

  static async openLoginWindow(): Promise<string> {
    if (this.pendingPromise) {
      return this.pendingPromise
    }

    this.pendingPromise = new Promise<string>((resolve, reject) => {
      const loginSession = session.fromPartition(this.PARTITION, { cache: true })

      let isResolved = false
      let rejectionError: Error | null = null

      const handleCookieChange = (
        _event: ElectronEvent,
        cookie: Cookie,
        _cause: 'explicit' | 'overwrite' | 'expired' | 'evicted' | 'expired-overwrite',
        removed: boolean
      ) => {
        if (!removed && cookie.name === '.ROBLOSECURITY') {
          isResolved = true
          resolve(cookie.value)
          this.loginWindow?.close()
        }
      }

      const cleanup = async () => {
        loginSession.cookies.removeListener('changed', handleCookieChange)
        loginSession.setPermissionRequestHandler(null)
        try {
          await loginSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
        } catch (error) {
          console.warn('[RobloxLoginWindow] Failed to remove security cookie after finish:', error)
        }
        this.loginWindow = null
        this.pendingPromise = null
      }

      const start = async () => {
        try {
          await loginSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
        } catch (error) {
          console.warn('[RobloxLoginWindow] Failed to remove previous security cookie:', error)
        }

        loginSession.cookies.on('changed', handleCookieChange)
        loginSession.setPermissionRequestHandler((_wc, permission, callback) => {
          if (permission && this.PERMITTED_PERMISSIONS.has(permission)) {
            callback(true)
          } else {
            callback(false)
          }
        })

        const windowOptions: BrowserWindowConstructorOptions = {
          width: 480,
          height: 720,
          title: 'Roblox Login',
          autoHideMenuBar: true,
          backgroundColor: '#050505',
          parent: BrowserWindow.getFocusedWindow() ?? undefined,
          modal: false,
          show: false,
          webPreferences: {
            partition: this.PARTITION,
            nodeIntegration: false,
            contextIsolation: true,
            spellcheck: true
          }
        }

        this.loginWindow = new BrowserWindow(windowOptions)

        const userAgent = this.getRealisticUserAgent()
        if (userAgent) {
          this.loginWindow.webContents.setUserAgent(userAgent)
        }

        this.loginWindow.on('ready-to-show', () => {
          this.loginWindow?.show()
          this.loginWindow?.focus()
        })

        this.loginWindow.on('closed', async () => {
          await cleanup()
          if (!isResolved) {
            reject(rejectionError ?? new Error('LOGIN_WINDOW_CLOSED'))
          }
        })

        this.loginWindow.webContents.setWindowOpenHandler(({ url }) => {
          shell.openExternal(url)
          return { action: 'deny' }
        })

        try {
          await this.loginWindow.loadURL(this.ROBLOX_LOGIN_URL, {
            httpReferrer: 'https://www.roblox.com/',
            userAgent: this.loginWindow.webContents.getUserAgent()
          })
        } catch (error) {
          rejectionError =
            error instanceof Error ? error : new Error('Failed to load Roblox login page')
          if (this.loginWindow && !this.loginWindow.isDestroyed()) {
            this.loginWindow.close()
          } else {
            await cleanup()
            reject(rejectionError)
          }
        }
      }

      void start().catch(async (error) => {
        rejectionError = error instanceof Error ? error : new Error('Failed to open login window')
        if (this.loginWindow && !this.loginWindow.isDestroyed()) {
          this.loginWindow.close()
          return
        }
        await cleanup()
        reject(rejectionError)
      })
    })

    return this.pendingPromise
  }

  static async openBrowserWithAccount(cookie: string, url: string = 'https://www.roblox.com/home'): Promise<void> {
    const partition = `persist:account-browser-${Date.now()}`
    const browserSession = session.fromPartition(partition, { cache: true })

    let browserWindow: BrowserWindow | null = null

    try {

      try {
        await browserSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
      } catch (error) {
        console.warn('[RobloxBrowser] Failed to clear previous cookie:', error)
      }

      await browserSession.cookies.set({
        url: 'https://www.roblox.com',
        name: '.ROBLOSECURITY',
        value: cookie,
        domain: '.roblox.com',
        path: '/',
        httpOnly: true,
        secure: true,
        expirationDate: Math.floor(Date.now() / 1000) + 31536000
      })

      const windowOptions: BrowserWindowConstructorOptions = {
        width: 1280,
        height: 800,
        title: 'Roblox Browser',
        autoHideMenuBar: true,
        backgroundColor: '#050505',
        parent: BrowserWindow.getFocusedWindow() ?? undefined,
        modal: false,
        show: true,
        webPreferences: {
          partition: partition,
          nodeIntegration: false,
          contextIsolation: true,
          spellcheck: true
        }
      }

      browserWindow = new BrowserWindow(windowOptions)

      const userAgent = this.getRealisticUserAgent()
      if (userAgent) {
        browserWindow.webContents.setUserAgent(userAgent)
      }

      browserWindow.on('ready-to-show', () => {
        browserWindow?.show()
        browserWindow?.focus()
      })

      browserWindow.on('closed', async () => {
        browserWindow = null

        try {
          await browserSession.clearCache()
          await browserSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
        } catch (error) {
          console.warn('[RobloxBrowser] Failed to clean up session after close:', error)
        }
      })

      browserWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
      })

      await browserWindow.loadURL(url, {
        httpReferrer: 'https://www.roblox.com/',
        userAgent: browserWindow.webContents.getUserAgent()
      })
    } catch (error) {
      console.error('[RobloxBrowser] Failed to open browser with account:', error)
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.close()
        browserWindow = null
      }

      try {
        await browserSession.clearCache()
        await browserSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
      } catch (e) {
        console.warn('[RobloxBrowser] Failed to clean up session on error:', e)
      }
      throw error instanceof Error ? error : new Error('Failed to open browser with account')
    }
  }

  private static getRealisticUserAgent(): string | null {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused) {
      const existingUA = focused.webContents.userAgent
      if (existingUA) {
        return existingUA
      }
    }


    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  }
}