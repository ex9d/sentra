import { ipcMain, BrowserWindow } from 'electron'
import { sniperService, SniperConfig } from './SniperService'
import usernameSniperService from './UsernameSniper'

// Track active sessions to manage event listeners
const activeSessions = new Map<string, BrowserWindow>()

export function registerSniperHandlers(): void {
  // Start monitoring
  ipcMain.handle('sniper:start-monitoring', () => {
    sniperService.startMonitoring()
    return { success: true }
  })

  // Stop monitoring
  ipcMain.handle('sniper:stop-monitoring', () => {
    sniperService.stopMonitoring()
    return { success: true }
  })

  // Update config
  ipcMain.handle('sniper:update-config', (_event, config: Partial<SniperConfig>) => {
    sniperService.updateConfig(config)
    return { success: true, config: sniperService.getConfig() }
  })

  // Get config
  ipcMain.handle('sniper:get-config', () => {
    return { success: true, config: sniperService.getConfig() }
  })

  // Get monitored items
  ipcMain.handle('sniper:get-monitored-items', () => {
    return { success: true, items: sniperService.getMonitoredItems() }
  })

  // Get history
  ipcMain.handle('sniper:get-history', (_event, limit?: number) => {
    return { success: true, history: sniperService.getHistory(limit || 100) }
  })

  // Clear history
  ipcMain.handle('sniper:clear-history', () => {
    sniperService.clearHistory()
    return { success: true }
  })

  // Check if monitoring
  ipcMain.handle('sniper:is-monitoring', () => {
    return { isMonitoring: sniperService.isMonitoring() }
  })

  // Calculate profit
  ipcMain.handle('sniper:calculate-profit', (_event, purchasePrice: number, resaleValue: number) => {
    return { success: true, ...sniperService.calculateProfit(purchasePrice, resaleValue) }
  })

  // LIMITED ITEM WATCHLIST HANDLERS
  // Add limited item to watch
  ipcMain.handle('sniper:add-limited-watch', async (_event, itemId: number, itemName: string, minProfitPercent?: number) => {
    try {
      await sniperService.addLimitedItemWatch(itemId, itemName, minProfitPercent)
      return { success: true, watches: sniperService.getLimitedItemWatches() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Remove limited item from watch
  ipcMain.handle('sniper:remove-limited-watch', (_event, itemId: number) => {
    sniperService.removeLimitedItemWatch(itemId)
    return { success: true, watches: sniperService.getLimitedItemWatches() }
  })

  // Get limited item watches
  ipcMain.handle('sniper:get-limited-watches', () => {
    return { success: true, watches: sniperService.getLimitedItemWatches() }
  })

  // Update limited item watch
  ipcMain.handle('sniper:update-limited-watch', (_event, itemId: number, updates: any) => {
    sniperService.updateLimitedItemWatch(itemId, updates)
    return { success: true, watches: sniperService.getLimitedItemWatches() }
  })

  // ========== USERNAME SNIPER HANDLERS ==========
  
  // Create session
  ipcMain.handle('sniper:createSession', async (_event, usernames: string[], proxies: string[] = [], loopEnabled: boolean = false, loopCount: number = 1, checkInterval: number = 200) => {
    try {
      const sessionId = await usernameSniperService.createSession(usernames, proxies, loopEnabled, loopCount, checkInterval)
      return { success: true, sessionId }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get session
  ipcMain.handle('sniper:getSession', (_event, sessionId: string) => {
    try {
      const session = usernameSniperService.getSession(sessionId)
      if (!session) {
        return { success: false, error: 'Session not found' }
      }
      return { success: true, session }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Start sniper
  ipcMain.handle('sniper:startSniper', async (_event, sessionId: string) => {
    try {
      const senderWindow = BrowserWindow.fromWebContents(_event.sender)
      if (!senderWindow) {
        return { success: false, error: 'Window not found' }
      }

      // Store the window for this session
      activeSessions.set(sessionId, senderWindow)

      // Remove old listeners
      usernameSniperService.removeAllListeners('valid')
      usernameSniperService.removeAllListeners('taken')
      usernameSniperService.removeAllListeners('censored')
      usernameSniperService.removeAllListeners('progress')
      usernameSniperService.removeAllListeners('completed')
      usernameSniperService.removeAllListeners('error')

      // Set up event listeners to forward events to renderer
      const listeners = {
        valid: (data: any) => {
          console.log('[Controller] LISTENER FIRED: valid', data.username)
          senderWindow.webContents.send('sniper:valid', data)
        },
        taken: (data: any) => {
          console.log('[Controller] LISTENER FIRED: taken', data.username)
          senderWindow.webContents.send('sniper:taken', data)
        },
        censored: (data: any) => {
          console.log('[Controller] LISTENER FIRED: censored', data.username)
          senderWindow.webContents.send('sniper:censored', data)
        },
        progress: (data: any) => {
          console.log('[Controller] Progress: checked', data.checked, '/', data.total)
          senderWindow.webContents.send('sniper:progress', data)
        },
        completed: (data: any) => {
          console.log('[Controller] LISTENER FIRED: completed')
          senderWindow.webContents.send('sniper:completed', data)
          activeSessions.delete(sessionId)
        },
        error: (data: any) => {
          senderWindow.webContents.send('sniper:error', data)
        },
      }

      // Register all listeners
      usernameSniperService.on('valid', listeners.valid)
      usernameSniperService.on('taken', listeners.taken)
      usernameSniperService.on('censored', listeners.censored)
      usernameSniperService.on('progress', listeners.progress)
      usernameSniperService.on('completed', listeners.completed)
      usernameSniperService.on('error', listeners.error)

      // Start the sniper
      await usernameSniperService.startSniper(sessionId)
      return { success: true }
    } catch (error) {
      activeSessions.delete(sessionId)
      return { success: false, error: String(error) }
    }
  })

  // Pause session
  ipcMain.handle('sniper:pauseSession', (_event, sessionId: string) => {
    try {
      usernameSniperService.pauseSession(sessionId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Stop session
  ipcMain.handle('sniper:stopSession', (_event, sessionId: string) => {
    try {
      usernameSniperService.stopSession(sessionId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Clear session
  ipcMain.handle('sniper:clearSession', (_event, sessionId: string) => {
    try {
      usernameSniperService.clearSession(sessionId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get valid usernames
  ipcMain.handle('sniper:getValidUsernames', (_event, sessionId: string) => {
    try {
      const usernames = usernameSniperService.getValidUsernames(sessionId)
      return { success: true, usernames }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
