import { EventEmitter } from 'events'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getDataFile } from '../../utils/paths'

export type SniperItem = {
  id: number
  name: string
  targetId: number
  purchasePrice: number
  resaleValue: number
  profit: number
  profitPercent: number
  timestamp: number
}

export type LimitedItemWatch = {
  itemId: number
  itemName: string
  minProfitPercent: number
  currentRAP: number
  currentValue: number
  lastUpdated: number
  enabled: boolean
}

export type SniperConfig = {
  minProfit: number
  maxPurchasePrice: number
  targetItemIds: number[]
  enabled: boolean
  pollingIntervalMs: number
  limitedItemMinProfitPercent: number // For limited items default
}

export type SniperLogEntry = {
  timestamp: number
  itemId: number
  itemName: string
  action: 'purchased' | 'monitored' | 'skipped' | 'error' | 'auto-buy'
  profit?: number
  profitPercent?: number
  reason?: string
}

export class SniperService extends EventEmitter {
  private config: SniperConfig = {
    minProfit: 5000,
    maxPurchasePrice: 50000,
    targetItemIds: [],
    enabled: false,
    pollingIntervalMs: 5000,
    limitedItemMinProfitPercent: 15 // Default 15% profit for limited items
  }

  private pollingIntervalId: NodeJS.Timeout | null = null
  private limitedWatchPollingIntervalId: NodeJS.Timeout | null = null
  private monitoredItems = new Map<number, SniperItem>()
  private limitedItemWatches = new Map<number, LimitedItemWatch>()
  private purchaseHistory: SniperLogEntry[] = []
  private configPath = getDataFile('sniper-config.json')
  private limitedWatchlistPath = getDataFile('sniper-limited-watchlist.json')

  constructor() {
    super()
    this.loadConfig()
    this.loadLimitedWatchlist()
  }

  /**
   * Start monitoring for items
   */
  startMonitoring(): void {
    if (this.pollingIntervalId) {
      console.warn('[Sniper] Monitoring already active')
      return
    }

    if (!this.config.enabled) {
      console.warn('[Sniper] Sniper is disabled')
      return
    }

    console.log('[Sniper] Starting monitoring...')
    this.emit('monitoring-started')

    this.pollingIntervalId = setInterval(() => {
      this.pollItems()
    }, this.config.pollingIntervalMs)

    // Do initial poll
    this.pollItems()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId)
      this.pollingIntervalId = null
      console.log('[Sniper] Monitoring stopped')
      this.emit('monitoring-stopped')
    }
    if (this.limitedWatchPollingIntervalId) {
      clearInterval(this.limitedWatchPollingIntervalId)
      this.limitedWatchPollingIntervalId = null
    }
  }

  /**
   * Add a limited item to watch with Rolimons RAP tracking
   */
  async addLimitedItemWatch(itemId: number, itemName: string, minProfitPercent?: number): Promise<void> {
    try {
      const watch: LimitedItemWatch = {
        itemId,
        itemName,
        minProfitPercent: minProfitPercent || this.config.limitedItemMinProfitPercent,
        currentRAP: 0,
        currentValue: 0,
        lastUpdated: Date.now(),
        enabled: true
      }

      // Fetch initial RAP from Rolimons
      const rap = await this.fetchRolimonsItemRAP(itemId)
      if (rap) {
        watch.currentRAP = rap.rap || 0
        watch.currentValue = rap.value || 0
      }

      this.limitedItemWatches.set(itemId, watch)
      this.saveLimitedWatchlist()

      console.log(`[Sniper] Added limited item to watch: ${itemName} (ID: ${itemId})`)
      this.emit('limited-item-added', watch)

      // Start limited watchlist polling if not already running
      if (!this.limitedWatchPollingIntervalId && this.config.enabled) {
        this.startLimitedWatchlistPolling()
      }
    } catch (err) {
      console.error('[Sniper] Failed to add limited item watch:', err)
      throw err
    }
  }

  /**
   * Remove a limited item from watchlist
   */
  removeLimitedItemWatch(itemId: number): void {
    this.limitedItemWatches.delete(itemId)
    this.saveLimitedWatchlist()
    console.log(`[Sniper] Removed limited item from watch: ${itemId}`)
    this.emit('limited-item-removed', itemId)
  }

  /**
   * Start polling limited items for RAP changes and auto-buy opportunities
   */
  private startLimitedWatchlistPolling(): void {
    if (this.limitedWatchPollingIntervalId) {
      return
    }

    console.log('[Sniper] Starting limited item watchlist polling...')
    
    this.limitedWatchPollingIntervalId = setInterval(() => {
      this.pollLimitedItems()
    }, 30000) // Poll every 30 seconds

    // Do initial poll
    this.pollLimitedItems()
  }

  /**
   * Poll limited items for RAP changes
   */
  private async pollLimitedItems(): Promise<void> {
    try {
      for (const watch of this.limitedItemWatches.values()) {
        if (!watch.enabled) continue

        // Fetch current RAP from Rolimons
        const itemData = await this.fetchRolimonsItemRAP(watch.itemId)
        if (!itemData) continue

        const oldRAP = watch.currentRAP
        watch.currentRAP = itemData.rap || 0
        watch.currentValue = itemData.value || 0
        watch.lastUpdated = Date.now()

        // Check if RAP changed significantly
        if (oldRAP > 0) {
          const rapChange = watch.currentRAP - oldRAP
          const rapChangePercent = (rapChange / oldRAP) * 100

          console.log(`[Sniper] ${watch.itemName}: RAP ${oldRAP} → ${watch.currentRAP} (${rapChangePercent > 0 ? '+' : ''}${rapChangePercent.toFixed(1)}%)`)

          // If profit potential exceeds threshold, emit alert
          if (rapChangePercent > watch.minProfitPercent) {
            console.log(`[Sniper] LIMITED ITEM OPPORTUNITY: ${watch.itemName} - RAP increased ${rapChangePercent.toFixed(1)}%!`)
            this.addLog({
              timestamp: Date.now(),
              itemId: watch.itemId,
              itemName: watch.itemName,
              action: 'auto-buy',
              profitPercent: rapChangePercent,
              reason: `RAP increased by ${rapChangePercent.toFixed(1)}%`
            })
            this.emit('limited-item-opportunity', { watch, rapChangePercent })
          }
        }

        this.saveLimitedWatchlist()
      }
    } catch (err) {
      console.error('[Sniper] Error polling limited items:', err)
    }
  }

  /**
   * Fetch RAP and Value for an item from Rolimons API
   * If value is -1 (not set), fetches current best price from resale market
   */
  private async fetchRolimonsItemRAP(itemId: number): Promise<{ rap: number; value: number } | null> {
    try {
      const response = await fetch(`https://api.rolimons.com/items/v2/itemdetails?ids=${itemId}`)
      
      if (!response.ok) {
        console.warn(`[Sniper] Rolimons API error for item ${itemId}: ${response.status}`)
        return null
      }

      const data = await response.json()
      
      if (!data.success || !data.items) {
        console.warn(`[Sniper] Invalid Rolimons response for item ${itemId}`)
        return null
      }

      // Items format: { itemId: [name, acronym, rap, value, ...] }
      const itemData = data.items[itemId.toString()]
      if (!itemData || !Array.isArray(itemData)) {
        console.warn(`[Sniper] No item data for ${itemId}`)
        return null
      }

      let rap = itemData[2] || 0 // RAP is at index 2
      let value = itemData[3] // Value is at index 3

      // If value is -1 (not set), try to fetch current best/resale price
      if (value === -1 || value === undefined || value === null) {
        console.log(`[Sniper] Value is -1 for item ${itemId}, fetching latest resale price...`)
        try {
          const resaleResponse = await fetch(
            `https://api.roblox.com/marketplace/products/${itemId}/details`
          )
          if (resaleResponse.ok) {
            const resaleData = await resaleResponse.json()
            if (resaleData && resaleData.lowestResalePrice !== null && resaleData.lowestResalePrice !== undefined) {
              value = resaleData.lowestResalePrice
              console.log(`[Sniper] Got lowest resale price for ${itemId}: ${value}`)
            }
          }
        } catch (err) {
          console.warn(`[Sniper] Failed to fetch resale price for item ${itemId}:`, err)
          value = rap // Fallback to RAP if resale fails
        }
      }

      return {
        rap: rap || 0,
        value: value || 0
      }
    } catch (err) {
      console.warn(`[Sniper] Failed to fetch Rolimons data for item ${itemId}:`, err)
      return null
    }
  }

  /**
   * Get all limited item watches
   */
  getLimitedItemWatches(): LimitedItemWatch[] {
    return Array.from(this.limitedItemWatches.values())
  }

  /**
   * Update limited item watch settings
   */
  updateLimitedItemWatch(itemId: number, updates: Partial<LimitedItemWatch>): void {
    const watch = this.limitedItemWatches.get(itemId)
    if (!watch) return

    Object.assign(watch, updates)
    this.saveLimitedWatchlist()
    this.emit('limited-item-updated', watch)
  }

  /**
   * Poll for items from Rolimons DealActivity API
   */
  private async pollItems(): Promise<void> {
    try {
      // Fetch recent deal activity from Rolimons API
      const deals = await this.fetchRolimonsDeals()

      if (!deals || deals.length === 0) {
        return
      }

      // Process each deal
      for (const deal of deals) {
        const item: SniperItem = {
          id: deal.item_id,
          name: deal.item_name || `Item ${deal.item_id}`,
          targetId: deal.item_id,
          purchasePrice: deal.price || 0,
          resaleValue: deal.rap || 0,
          profit: 0,
          profitPercent: 0,
          timestamp: Date.now()
        }

        this.handleItemListing(item)
      }
    } catch (err) {
      console.error('[Sniper] Poll error:', err)
      this.addLog({
        timestamp: Date.now(),
        itemId: 0,
        itemName: 'Unknown',
        action: 'error',
        reason: String(err)
      })
    }
  }

  /**
   * Fetch recent deals from Rolimons DealActivity API
   */
  private async fetchRolimonsDeals(): Promise<any[]> {
    try {
      const response = await fetch('https://api.rolimons.com/market/v1/dealactivity')
      
      if (!response.ok) {
        throw new Error(`Rolimons API error: ${response.statusText}`)
      }

      const data = await response.json()

      // DealActivity returns array of recent deals
      // Format: [item_id, timestamp, seller_id, price, ...]
      if (!Array.isArray(data) || data.length === 0) {
        return []
      }

      // Convert raw format to deal objects
      const deals = data.slice(0, 10).map((deal: any[]) => ({
        item_id: deal[0],
        timestamp: deal[1],
        seller_id: deal[2],
        price: deal[3],
        rap: deal[4] // Minimum RAP after transaction
      }))

      return deals
    } catch (err) {
      console.warn('[Sniper] Failed to fetch Rolimons deals:', err)
      return []
    }
  }

  /**
   * Handle an item listing
   */
  private handleItemListing(item: SniperItem): void {
    // Calculate profit
    const profit = item.resaleValue - item.purchasePrice
    const profitPercent = (profit / item.purchasePrice) * 100

    item.profit = profit
    item.profitPercent = profitPercent

    // Check if should buy
    if (this.shouldBuy(item)) {
      console.log(
        `[Sniper] BUY OPPORTUNITY: ${item.name} - Profit: ${profit} (${profitPercent.toFixed(1)}%)`
      )

      this.executeBuy(item)
    } else {
      // Log as monitored
      this.addLog({
        timestamp: Date.now(),
        itemId: item.id,
        itemName: item.name,
        action: 'monitored',
        profit: profit
      })
    }

    // Store in monitored items
    this.monitoredItems.set(item.id, item)
  }

  /**
   * Check if item meets buy criteria
   */
  shouldBuy(item: SniperItem): boolean {
    if (item.purchasePrice > this.config.maxPurchasePrice) {
      return false
    }

    if (item.profit < this.config.minProfit) {
      return false
    }

    return true
  }

  /**
   * Execute purchase (placeholder - real implementation calls buyItem from asset service)
   */
  private executeBuy(item: SniperItem): void {
    console.log(`[Sniper] Executing purchase for item ${item.id}...`)

    // In production, call the actual purchase API
    // await this.buyItem(item.id, item.purchasePrice)

    this.addLog({
      timestamp: Date.now(),
      itemId: item.id,
      itemName: item.name,
      action: 'purchased',
      profit: item.profit
    })

    this.emit('purchase-executed', item)
  }

  /**
   * Add log entry
   */
  private addLog(entry: SniperLogEntry): void {
    this.purchaseHistory.push(entry)
    this.emit('log-entry', entry)
  }

  /**
   * Update sniper config
   */
  updateConfig(config: Partial<SniperConfig>): void {
    this.config = { ...this.config, ...config }
    this.saveConfig()
    console.log('[Sniper] Config updated:', this.config)
    this.emit('config-updated', this.config)
  }

  /**
   * Get current config
   */
  getConfig(): SniperConfig {
    return { ...this.config }
  }

  /**
   * Get purchase history / logs
   */
  getHistory(limit: number = 100): SniperLogEntry[] {
    return this.purchaseHistory.slice(-limit)
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.purchaseHistory = []
    console.log('[Sniper] History cleared')
  }

  /**
   * Get monitored items
   */
  getMonitoredItems(): SniperItem[] {
    return Array.from(this.monitoredItems.values())
  }

  /**
   * Save config to file
   */
  private saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (err) {
      console.error('[Sniper] Failed to save config:', err)
    }
  }

  /**
   * Load config from file
   */
  private loadConfig(): void {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf-8')
        const loaded = JSON.parse(data)
        this.config = { ...this.config, ...loaded }
        console.log('[Sniper] Config loaded')
      }
    } catch (err) {
      console.error('[Sniper] Failed to load config:', err)
    }
  }

  /**
   * Save limited watchlist to file
   */
  private saveLimitedWatchlist(): void {
    try {
      const watches = Array.from(this.limitedItemWatches.values())
      writeFileSync(this.limitedWatchlistPath, JSON.stringify(watches, null, 2))
    } catch (err) {
      console.error('[Sniper] Failed to save limited watchlist:', err)
    }
  }

  /**
   * Load limited watchlist from file
   */
  private loadLimitedWatchlist(): void {
    try {
      if (existsSync(this.limitedWatchlistPath)) {
        const data = readFileSync(this.limitedWatchlistPath, 'utf-8')
        const watches = JSON.parse(data) as LimitedItemWatch[]
        for (const watch of watches) {
          this.limitedItemWatches.set(watch.itemId, watch)
        }
        console.log(`[Sniper] Loaded ${watches.length} limited item watches`)
      }
    } catch (err) {
      console.error('[Sniper] Failed to load limited watchlist:', err)
    }
  }

  /**
   * Calculate profit for an item
   */
  calculateProfit(purchasePrice: number, resaleValue: number): { profit: number; profitPercent: number } {
    const profit = resaleValue - purchasePrice
    const profitPercent = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0

    return { profit, profitPercent }
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.pollingIntervalId !== null
  }
}

export const sniperService = new SniperService()
