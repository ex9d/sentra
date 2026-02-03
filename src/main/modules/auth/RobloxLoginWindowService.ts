import { BrowserWindow, BrowserWindowConstructorOptions, session, shell, BrowserView, ipcMain } from 'electron'
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
          if (permission && this.PERMITTED_PERMISSIONS.has(permission)) callback(true)
          else callback(false)
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
        if (userAgent) this.loginWindow.webContents.setUserAgent(userAgent)

        this.loginWindow.on('ready-to-show', () => {
          this.loginWindow?.show()
          this.loginWindow?.focus()
        })

        this.loginWindow.webContents.on('render-process-gone', (_event, details) => {
          console.error('[RobloxLoginWindow] Renderer process gone:', details)
          try {
            if (this.loginWindow && !this.loginWindow.isDestroyed()) {
              this.loginWindow.close()
            }
          } catch (err) {
            console.warn('[RobloxLoginWindow] Error during cleanup after renderer gone:', err)
          }
        })

        this.loginWindow.on('unresponsive', () => {
          try {
            if (this.loginWindow && !this.loginWindow.isDestroyed()) {
              this.loginWindow.close()
            }
          } catch {}
        })

        this.loginWindow.on('closed', async () => {
          await cleanup()
          if (!isResolved) reject(rejectionError ?? new Error('LOGIN_WINDOW_CLOSED'))
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

  static async openBrowserWithAccount(
    cookie: string,
    url: string = 'https://www.roblox.com/home',
    windowWidth?: number,
    windowHeight?: number
  ): Promise<void> {
    const partition = `persist:account-browser-${Date.now()}`
    const browserSession = session.fromPartition(partition, { cache: true })

    let browserWindow: BrowserWindow | null = null

    try {
      try {
        await browserSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
      } catch {}

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
        width: windowWidth && windowWidth > 0 ? windowWidth : 1280,
        height: windowHeight && windowHeight > 0 ? windowHeight : 800,
        title: 'Roblox Browser',
        autoHideMenuBar: true,
        backgroundColor: '#050505',
        show: true,
        webPreferences: {
          partition,
          nodeIntegration: false,
          contextIsolation: true,
          webviewTag: true,
          spellcheck: true
        }
      }

      browserWindow = new BrowserWindow(windowOptions)

      const userAgent = this.getRealisticUserAgent()
      if (userAgent) browserWindow.webContents.setUserAgent(userAgent)

      browserWindow.webContents.on('render-process-gone', () => {
        if (browserWindow && !browserWindow.isDestroyed()) browserWindow.close()
      })

      browserWindow.on('unresponsive', () => {
        if (browserWindow && !browserWindow.isDestroyed()) browserWindow.close()
      })

      browserWindow.on('closed', async () => {
        browserWindow = null
        try {
          await browserSession.clearCache()
          await browserSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
        } catch {}
      })

      const toolbarHeight = 40

      const toolbarView = new BrowserView({ webPreferences: { nodeIntegration: true, contextIsolation: false } })
      const contentView = new BrowserView({ webPreferences: { partition, nodeIntegration: false, contextIsolation: true } })

      browserWindow.setBrowserView(toolbarView)
      browserWindow.addBrowserView(contentView)

      const resizeViews = () => {
        if (!browserWindow || browserWindow.isDestroyed()) return
        const [w, h] = browserWindow.getContentSize()
        toolbarView.setBounds({ x: 0, y: 0, width: w, height: toolbarHeight })
        contentView.setBounds({ x: 0, y: toolbarHeight, width: w, height: Math.max(0, h - toolbarHeight) })
        toolbarView.setAutoResize({ width: true })
        contentView.setAutoResize({ width: true, height: true })
      }

      resizeViews()
      browserWindow.on('resize', resizeViews)

      const ipcChannel = 'sentra-browser-cmd'

      const ipcHandler = (_event: any, cmd: string, payload?: any) => {
        if (!contentView?.webContents) return
        switch (cmd) {
          case 'back':
            if (contentView.webContents.canGoBack()) contentView.webContents.goBack()
            break
          case 'forward':
            if (contentView.webContents.canGoForward()) contentView.webContents.goForward()
            break
          case 'reload':
            contentView.webContents.reload()
            break
          case 'load':
            if (typeof payload === 'string') {
              let u = payload.trim()
              if (!/^https?:\/\//i.test(u)) u = 'https://' + u
              contentView.webContents.loadURL(u)
            }
            break
        }
      }

      ipcMain.on(ipcChannel, ipcHandler)

      browserWindow.on('closed', () => {
        ipcMain.removeListener(ipcChannel, ipcHandler)
      })

      await contentView.webContents.loadURL(url, {
        httpReferrer: 'https://www.roblox.com/',
        userAgent: browserWindow.webContents.getUserAgent()
      })
    } catch (error) {
      if (browserWindow && !browserWindow.isDestroyed()) browserWindow.close()
      try {
        await browserSession.clearCache()
        await browserSession.cookies.remove('https://www.roblox.com', '.ROBLOSECURITY')
      } catch {}
      throw error instanceof Error ? error : new Error('Failed to open browser with account')
    }
  }

  private static getRealisticUserAgent(): string {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused?.webContents.userAgent) return focused.webContents.userAgent
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  }
}