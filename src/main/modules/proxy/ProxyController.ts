import { ipcMain } from 'electron'
import { proxyService } from './ProxyService'

export function registerProxyHandlers(): void {
  // Add single proxy
  ipcMain.handle('proxy:add', (_event, host: string, port: number, username?: string, password?: string) => {
    const proxy = proxyService.addProxy(host, port, username, password)
    return { success: true, proxy }
  })

  // Add multiple proxies from list
  ipcMain.handle('proxy:add-list', (_event, proxyStrings: string[]) => {
    const proxies = proxyService.addProxyList(proxyStrings)
    return { success: true, count: proxies.length, proxies }
  })

  // Test single proxy
  ipcMain.handle('proxy:test', async (_event, proxyId: string) => {
    const result = await proxyService.testProxy(proxyId)
    return { success: true, result }
  })

  // Test all proxies
  ipcMain.handle('proxy:test-all', async () => {
    const results = await proxyService.testAllProxies()
    return { success: true, results }
  })

  // Assign proxy to account
  ipcMain.handle('proxy:assign', (_event, accountId: string, proxyId?: string) => {
    const assigned = proxyService.assignProxy(accountId, proxyId)
    return { success: assigned !== null, proxyId: assigned }
  })

  // Get next proxy
  ipcMain.handle('proxy:get-next', () => {
    const proxyId = proxyService.getNextProxy()
    return { success: proxyId !== null, proxyId }
  })

  // Rotate proxy for account
  ipcMain.handle('proxy:rotate', (_event, accountId: string) => {
    const newProxyId = proxyService.rotateProxy(accountId)
    return { success: newProxyId !== null, proxyId: newProxyId }
  })

  // Get proxy for account
  ipcMain.handle('proxy:get-for-account', (_event, accountId: string) => {
    const proxy = proxyService.getProxyForAccount(accountId)
    return { success: true, proxy }
  })

  // Get all proxies
  ipcMain.handle('proxy:get-all', () => {
    const proxies = proxyService.getAllProxies()
    return { success: true, proxies }
  })

  // Get alive proxies
  ipcMain.handle('proxy:get-alive', () => {
    const proxies = proxyService.getAliveProxies()
    return { success: true, proxies, count: proxies.length }
  })

  // Remove proxy
  ipcMain.handle('proxy:remove', (_event, proxyId: string) => {
    const success = proxyService.removeProxy(proxyId)
    return { success }
  })

  // Clear all proxies
  ipcMain.handle('proxy:clear-all', () => {
    proxyService.clearAllProxies()
    return { success: true }
  })

  // AUTO-SWAP HANDLERS
  // Start auto-swap
  ipcMain.handle('proxy:start-auto-swap', (_event, intervalHours: number, autoTestBeforeSwap: boolean) => {
    proxyService.startAutoSwap(intervalHours, autoTestBeforeSwap)
    return { success: true, config: proxyService.getAutoSwapConfig() }
  })

  // Stop auto-swap
  ipcMain.handle('proxy:stop-auto-swap', () => {
    proxyService.stopAutoSwap()
    return { success: true }
  })

  // Get auto-swap config
  ipcMain.handle('proxy:get-auto-swap-config', () => {
    return { success: true, config: proxyService.getAutoSwapConfig() }
  })

  // Check if auto-swap is running
  ipcMain.handle('proxy:is-auto-swap-running', () => {
    return { isRunning: proxyService.isAutoSwapRunning() }
  })
}
