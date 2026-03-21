// Sniper API
import { invoke } from './invoke'
import { z } from 'zod'
import { ipcRenderer } from 'electron'

// ============================================================================
// SNIPER API
// ============================================================================

const successSchema = z.object({ success: z.boolean() })
const configSchema = z.object({ success: z.boolean(), config: z.any() })
const itemsSchema = z.object({ success: z.boolean(), items: z.array(z.any()) })
const historySchema = z.object({ success: z.boolean(), history: z.array(z.any()) })
const monitoringSchema = z.object({ isMonitoring: z.boolean() })
const profitSchema = z.object({ success: z.boolean(), profit: z.number(), profitPercent: z.number() })
const watchesSchema = z.object({ success: z.boolean(), watches: z.array(z.any()).optional(), error: z.string().optional() })

// Username Sniper schemas
const sessionIdSchema = z.object({ success: z.boolean(), sessionId: z.string().optional(), error: z.string().optional() })
const sessionSchema = z.object({ success: z.boolean(), session: z.any().optional(), error: z.string().optional() })
const usernamesListSchema = z.object({ success: z.boolean(), usernames: z.array(z.string()).optional(), error: z.string().optional() })

export const sniperApi = {
  // ========== LIMITED ITEMS SNIPER ==========
  startMonitoring: () => invoke('sniper:start-monitoring', successSchema),
  stopMonitoring: () => invoke('sniper:stop-monitoring', successSchema),
  updateConfig: (config: any) => invoke('sniper:update-config', configSchema, config),
  getConfig: () => invoke('sniper:get-config', configSchema),
  getMonitoredItems: () => invoke('sniper:get-monitored-items', itemsSchema),
  getHistory: (limit?: number) => invoke('sniper:get-history', historySchema, limit),
  clearHistory: () => invoke('sniper:clear-history', successSchema),
  isMonitoring: () => invoke('sniper:is-monitoring', monitoringSchema),
  calculateProfit: (purchasePrice: number, resaleValue: number) =>
    invoke('sniper:calculate-profit', profitSchema, purchasePrice, resaleValue),

  // Limited Item Watchlist API
  addLimitedWatch: (itemId: number, itemName: string, minProfitPercent?: number) =>
    invoke('sniper:add-limited-watch', watchesSchema, itemId, itemName, minProfitPercent),
  removeLimitedWatch: (itemId: number) =>
    invoke('sniper:remove-limited-watch', watchesSchema, itemId),
  getLimitedWatches: () =>
    invoke('sniper:get-limited-watches', watchesSchema),
  updateLimitedWatch: (itemId: number, updates: any) =>
    invoke('sniper:update-limited-watch', watchesSchema, itemId, updates),

  // ========== USERNAME SNIPER ==========
  createSession: (usernames: string[], proxies?: string[], loopEnabled?: boolean, loopCount?: number, checkInterval?: number) =>
    invoke('sniper:createSession', sessionIdSchema, usernames, proxies || [], loopEnabled || false, loopCount || 1, checkInterval || 200),
  getSession: (sessionId: string) =>
    invoke('sniper:getSession', sessionSchema, sessionId),
  startSniper: (sessionId: string) =>
    invoke('sniper:startSniper', successSchema, sessionId),
  pauseSession: (sessionId: string) =>
    invoke('sniper:pauseSession', successSchema, sessionId),
  stopSession: (sessionId: string) =>
    invoke('sniper:stopSession', successSchema, sessionId),
  clearSession: (sessionId: string) =>
    invoke('sniper:clearSession', successSchema, sessionId),
  getValidUsernames: (sessionId: string) =>
    invoke('sniper:getValidUsernames', usernamesListSchema, sessionId),

  // ========== USERNAME SNIPER EVENT LISTENERS ==========
  onValid: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sniper:valid', listener)
    return () => ipcRenderer.removeListener('sniper:valid', listener)
  },
  onTaken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sniper:taken', listener)
    return () => ipcRenderer.removeListener('sniper:taken', listener)
  },
  onCensored: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sniper:censored', listener)
    return () => ipcRenderer.removeListener('sniper:censored', listener)
  },
  onProgress: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sniper:progress', listener)
    return () => ipcRenderer.removeListener('sniper:progress', listener)
  },
  onCompleted: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sniper:completed', listener)
    return () => ipcRenderer.removeListener('sniper:completed', listener)
  },
  onError: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sniper:error', listener)
    return () => ipcRenderer.removeListener('sniper:error', listener)
  },
}

