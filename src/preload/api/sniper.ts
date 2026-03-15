// Sniper API disabled for now
import { invoke } from './invoke'
import { z } from 'zod'

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

export const sniperApi = {
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
    invoke('sniper:update-limited-watch', watchesSchema, itemId, updates)
}
