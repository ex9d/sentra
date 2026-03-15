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

      // Load a minimal toolbar UI into the toolbar BrowserView so navigation controls are visible.
      try {
        const toolbarHTML = `<!doctype html>
          <html>
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src *;">
            <style>
              :root{ --bg:#0b0b0b; --btn:#1a1a1a; --btn-border:#333; --btn-hover:#252525; --text:#ddd; --accent:75,140,255 }
              body { margin:0; background:var(--bg); color:var(--text); font-family:Inter, Arial, Helvetica, sans-serif; -webkit-font-smoothing:antialiased }
              .bar { height:40px; display:flex; align-items:center; gap:8px; padding:6px; box-sizing:border-box; opacity:0; transform:translateY(-6px); animation:toolbarFade 220ms ease forwards }
              button{ background:var(--btn); border:1px solid var(--btn-border); color:var(--text); padding:6px 10px; border-radius:8px; cursor:pointer; transition:transform 140ms cubic-bezier(.2,.9,.2,1), background-color 140ms, box-shadow 140ms; box-shadow:0 3px 8px rgba(0,0,0,0.35); display:inline-flex; align-items:center; justify-content:center; font-weight:600 }
              button:hover{ transform:translateY(-2px); background:var(--btn-hover); box-shadow:0 8px 20px rgba(0,0,0,0.45) }
              button:active{ transform:translateY(0) scale(0.985) }
              button:disabled{ opacity:.45; transform:none; cursor:not-allowed; box-shadow:none }
              input{ flex:1; padding:8px 10px; border-radius:10px; border:1px solid #2b2b2b; background:#0f0f0f; color:#fff; transition:box-shadow 140ms, border-color 140ms, transform 140ms; outline:none }
              input:focus{ box-shadow:0 6px 24px rgba(var(--accent),0.12); border-color: rgba(75,140,255,0.6); transform:translateY(-1px) }
              @keyframes toolbarFade{ to{ opacity:1; transform:translateY(0) } }
            </style>
          </head>
          <body>
            <div class="bar">
              <button id="back">◀</button>
              <button id="forward">▶</button>
              <button id="reload">⟳</button>
              <input id="url" placeholder="https://example.com" />
              <button id="go">Go</button>
            </div>
            <script>
              const { ipcRenderer } = require('electron')
              const $ = (id) => document.getElementById(id)
              $('back').addEventListener('click', () => ipcRenderer.send('${ipcChannel}', 'back'))
              $('forward').addEventListener('click', () => ipcRenderer.send('${ipcChannel}', 'forward'))
              $('reload').addEventListener('click', () => ipcRenderer.send('${ipcChannel}', 'reload'))
              $('go').addEventListener('click', () => { const v = $('url').value || ''; ipcRenderer.send('${ipcChannel}', 'load', v) })
              $('url').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('go').click() })
            </script>
          </body>
          </html>`

        await toolbarView.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(toolbarHTML))
      } catch (err) {
        // Non-fatal: if toolbar fails to load, continue without it
        console.warn('[RobloxLoginWindow] Failed to load toolbar UI', err)
      }

      // Update toolbar button enabled state when navigation events occur in the content view
      const updateToolbarButtons = async () => {
        try {
          if (!toolbarView?.webContents || !contentView?.webContents) return
          const canBack = await contentView.webContents.canGoBack()
          const canForward = await contentView.webContents.canGoForward()
          await toolbarView.webContents.executeJavaScript(`document.getElementById('back').disabled = ${!canBack}`)
          await toolbarView.webContents.executeJavaScript(`document.getElementById('forward').disabled = ${!canForward}`)
          const currentUrl = contentView.webContents.getURL() || ''
          await toolbarView.webContents.executeJavaScript(`document.getElementById('url').value = ${JSON.stringify(currentUrl)}`)
        } catch {}
      }

      if (contentView?.webContents) {
        contentView.webContents.on('did-navigate', updateToolbarButtons)
        contentView.webContents.on('did-navigate-in-page', updateToolbarButtons)
        contentView.webContents.on('did-finish-load', updateToolbarButtons)
      }

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

  /**
   * Open signup browser with custom toolbar for account generation
   * Returns the BrowserWindow and allows Playwright to interact with it
   */
  static async openSignupBrowser(
    windowWidth?: number,
    windowHeight?: number
  ): Promise<{ browserWindow: BrowserWindow; pageUrl: string; webContents: any; partition: string }> {
    const partition = `persist:signup-${Date.now()}`
    const signupSession = session.fromPartition(partition, { cache: true })

    let browserWindow: BrowserWindow | null = null

    try {
      const windowOptions: BrowserWindowConstructorOptions = {
        width: windowWidth && windowWidth > 0 ? windowWidth : 1280,
        height: windowHeight && windowHeight > 0 ? windowHeight : 800,
        title: 'Roblox Signup',
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
          await signupSession.clearCache()
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

      const ipcChannel = 'sentra-signup-browser-cmd'

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

      // Load toolbar UI (same as openBrowserWithAccount)
      try {
        const toolbarHTML = `<!doctype html>
          <html>
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src *;">
            <style>
              :root{ --bg:#0b0b0b; --btn:#1a1a1a; --btn-border:#333; --btn-hover:#252525; --text:#ddd; --accent:75,140,255 }
              body { margin:0; background:var(--bg); color:var(--text); font-family:Inter, Arial, Helvetica, sans-serif; -webkit-font-smoothing:antialiased }
              .bar { height:40px; display:flex; align-items:center; gap:8px; padding:6px; box-sizing:border-box; opacity:0; transform:translateY(-6px); animation:toolbarFade 220ms ease forwards }
              button{ background:var(--btn); border:1px solid var(--btn-border); color:var(--text); padding:6px 10px; border-radius:8px; cursor:pointer; transition:transform 140ms cubic-bezier(.2,.9,.2,1), background-color 140ms, box-shadow 140ms; box-shadow:0 3px 8px rgba(0,0,0,0.35); display:inline-flex; align-items:center; justify-content:center; font-weight:600 }
              button:hover{ transform:translateY(-2px); background:var(--btn-hover); box-shadow:0 8px 20px rgba(0,0,0,0.45) }
              button:active{ transform:translateY(0) scale(0.985) }
              button:disabled{ opacity:.45; transform:none; cursor:not-allowed; box-shadow:none }
              input{ flex:1; padding:8px 10px; border-radius:10px; border:1px solid #2b2b2b; background:#0f0f0f; color:#fff; transition:box-shadow 140ms, border-color 140ms, transform 140ms; outline:none }
              input:focus{ box-shadow:0 6px 24px rgba(var(--accent),0.12); border-color: rgba(75,140,255,0.6); transform:translateY(-1px) }
              @keyframes toolbarFade{ to{ opacity:1; transform:translateY(0) } }
            </style>
          </head>
          <body>
            <div class="bar">
              <button id="back">◀</button>
              <button id="forward">▶</button>
              <button id="reload">⟳</button>
              <input id="url" placeholder="https://example.com" />
              <button id="go">Go</button>
            </div>
            <script>
              const { ipcRenderer } = require('electron')
              const $ = (id) => document.getElementById(id)
              $('back').addEventListener('click', () => ipcRenderer.send('${ipcChannel}', 'back'))
              $('forward').addEventListener('click', () => ipcRenderer.send('${ipcChannel}', 'forward'))
              $('reload').addEventListener('click', () => ipcRenderer.send('${ipcChannel}', 'reload'))
              $('go').addEventListener('click', () => { const v = $('url').value || ''; ipcRenderer.send('${ipcChannel}', 'load', v) })
              $('url').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('go').click() })
            </script>
          </body>
          </html>`

        await toolbarView.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(toolbarHTML))
      } catch (err) {
        console.warn('[RobloxSignupBrowser] Failed to load toolbar UI', err)
      }

      // Update toolbar buttons
      const updateToolbarButtons = async () => {
        try {
          if (!toolbarView?.webContents || !contentView?.webContents) return
          const canBack = await contentView.webContents.canGoBack()
          const canForward = await contentView.webContents.canGoForward()
          await toolbarView.webContents.executeJavaScript(`document.getElementById('back').disabled = ${!canBack}`)
          await toolbarView.webContents.executeJavaScript(`document.getElementById('forward').disabled = ${!canForward}`)
          const currentUrl = contentView.webContents.getURL() || ''
          await toolbarView.webContents.executeJavaScript(`document.getElementById('url').value = ${JSON.stringify(currentUrl)}`)
        } catch {}
      }

      if (contentView?.webContents) {
        contentView.webContents.on('did-navigate', updateToolbarButtons)
        contentView.webContents.on('did-navigate-in-page', updateToolbarButtons)
        contentView.webContents.on('did-finish-load', updateToolbarButtons)
      }

      browserWindow.on('closed', () => {
        ipcMain.removeListener(ipcChannel, ipcHandler)
      })

      // Load signup page in content view
      await contentView.webContents.loadURL('https://www.roblox.com/signup', {
        httpReferrer: 'https://www.roblox.com/',
        userAgent: browserWindow.webContents.getUserAgent()
      })

      console.log('[RobloxSignupBrowser] Signup browser opened with custom toolbar')

      return {
        browserWindow,
        pageUrl: 'https://www.roblox.com/signup',
        webContents: contentView.webContents,
        partition
      }
    } catch (error) {
      if (browserWindow && !browserWindow.isDestroyed()) browserWindow.close()
      try {
        await signupSession.clearCache()
      } catch {}
      throw error instanceof Error ? error : new Error('Failed to open signup browser')
    }
  }

  private static getRealisticUserAgent(): string {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused?.webContents.userAgent) return focused.webContents.userAgent
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  }
}