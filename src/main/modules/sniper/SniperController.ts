import { ipcMain } from 'electron'
import { sniperService, SniperConfig } from './SniperService'

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
}
