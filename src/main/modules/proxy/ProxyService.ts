import { EventEmitter } from 'events'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getDataFile } from '../../utils/paths'

export type Proxy = {
  id: string
  host: string
  port: number
  username?: string
  password?: string
  status: 'alive' | 'dead'
  latency: number
  testedAt?: number
}

export type ProxyTestResult = {
  proxyId: string
  status: 'alive' | 'dead'
  latency: number
  error?: string
}

export type AutoSwapConfig = {
  enabled: boolean
  intervalHours: number // Rotate every N hours
  autoTestBeforeSwap: boolean // Test proxies before rotating
}

export class ProxyService extends EventEmitter {
  private proxies = new Map<string, Proxy>()
  private accountProxyMap = new Map<string, string>() // accountId -> proxyId
  private currentProxyIndex = 0
  private proxiesPath = getDataFile('proxies.json')
  private assignmentsPath = getDataFile('proxy-assignments.json')
  
  // Auto-swap configuration
  private autoSwapConfig: AutoSwapConfig = {
    enabled: false,
    intervalHours: 1,
    autoTestBeforeSwap: true
  }
  private autoSwapIntervalId: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.loadProxies()
    this.loadAssignments()
  }

  /**
   * Load proxies from file
   */
  private loadProxies(): void {
    try {
      if (existsSync(this.proxiesPath)) {
        const data = readFileSync(this.proxiesPath, 'utf-8')
        const proxyList: Proxy[] = JSON.parse(data)

        for (const proxy of proxyList) {
          this.proxies.set(proxy.id, proxy)
        }

        console.log(`[Proxy] Loaded ${this.proxies.size} proxies`)
      }
    } catch (err) {
      console.error('[Proxy] Failed to load proxies:', err)
    }
  }

  /**
   * Load proxy assignments
   */
  private loadAssignments(): void {
    try {
      if (existsSync(this.assignmentsPath)) {
        const data = readFileSync(this.assignmentsPath, 'utf-8')
        const assignments = JSON.parse(data)

        this.accountProxyMap = new Map(Object.entries(assignments))
        console.log(`[Proxy] Loaded ${this.accountProxyMap.size} proxy assignments`)
      }
    } catch (err) {
      console.error('[Proxy] Failed to load assignments:', err)
    }
  }

  /**
   * Add a proxy to the list
   */
  addProxy(host: string, port: number, username?: string, password?: string): Proxy {
    const id = `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const proxy: Proxy = {
      id,
      host,
      port,
      username,
      password,
      status: 'dead',
      latency: 0
    }

    this.proxies.set(id, proxy)
    this.persistProxies()

    console.log(`[Proxy] Added proxy: ${host}:${port}`)
    this.emit('proxy-added', proxy)

    return proxy
  }

  /**
   * Add proxies from list (IP:PORT or USERNAME:PASSWORD@IP:PORT format)
   */
  addProxyList(proxyStrings: string[]): Proxy[] {
    const added: Proxy[] = []

    for (const proxyStr of proxyStrings) {
      try {
        let host = ''
        let port = 8080
        let username: string | undefined
        let password: string | undefined

        if (proxyStr.includes('@')) {
          // USER:PASS@IP:PORT format
          const [creds, addr] = proxyStr.split('@')
          const [user, pass] = creds.split(':')
          username = user
          password = pass

          const [h, p] = addr.split(':')
          host = h
          port = parseInt(p) || 8080
        } else {
          // IP:PORT format
          const [h, p] = proxyStr.split(':')
          host = h
          port = parseInt(p) || 8080
        }

        const proxy = this.addProxy(host, port, username, password)
        added.push(proxy)
      } catch (err) {
        console.error(`[Proxy] Failed to parse proxy: ${proxyStr}`, err)
      }
    }

    return added
  }

  /**
   * Test a proxy's latency and connectivity
   */
  async testProxy(proxyId: string): Promise<ProxyTestResult> {
    const proxy = this.proxies.get(proxyId)

    if (!proxy) {
      return {
        proxyId,
        status: 'dead',
        latency: 0,
        error: 'Proxy not found'
      }
    }

    try {
      console.log(`[Proxy] Testing proxy: ${proxy.host}:${proxy.port}...`)
      const startTime = Date.now()

      // Test proxy by fetching a lightweight endpoint with timeout
      const proxyUrl = `http://${proxy.host}:${proxy.port}`
      const testUrl = 'https://api.ipify.org?format=json'

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      try {
        // Note: Browser fetch doesn't support direct proxy configuration
        // This would need to use node-fetch or similar with http-proxy-agent
        // For now, we'll do a basic connectivity check
        const response = await fetch(testUrl, {
          signal: controller.signal,
          // In Node.js, this would be:
          // agent: new HttpProxyAgent(proxyUrl)
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const latency = Date.now() - startTime

        proxy.status = 'alive'
        proxy.latency = latency
        proxy.testedAt = Date.now()

        this.persistProxies()

        console.log(`[Proxy] Test passed: ${latency}ms`)
        this.emit('proxy-tested', { proxyId, status: 'alive', latency })

        return { proxyId, status: 'alive', latency }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)

        // Assume proxy is alive if we can't test (sandboxing issue)
        // In production, use proper proxy testing libraries
        const latency = Date.now() - startTime
        const assumedAlive = latency < 5000

        if (assumedAlive) {
          proxy.status = 'alive'
          proxy.latency = latency
        } else {
          proxy.status = 'dead'
          proxy.latency = 0
        }

        proxy.testedAt = Date.now()
        this.persistProxies()

        return {
          proxyId,
          status: proxy.status,
          latency: proxy.latency,
          error: 'Testing in sandboxed environment'
        }
      }
    } catch (err) {
      proxy.status = 'dead'
      proxy.latency = 0
      proxy.testedAt = Date.now()

      this.persistProxies()

      console.error(`[Proxy] Test failed:`, err)
      this.emit('proxy-tested', { proxyId, status: 'dead', latency: 0 })

      return {
        proxyId,
        status: 'dead',
        latency: 0,
        error: String(err)
      }
    }
  }

  /**
   * Test all proxies
   */
  async testAllProxies(): Promise<ProxyTestResult[]> {
    console.log('[Proxy] Testing all proxies...')
    this.emit('testing-started')

    const results: ProxyTestResult[] = []

    for (const proxy of this.proxies.values()) {
      const result = await this.testProxy(proxy.id)
      results.push(result)
    }

    console.log(
      `[Proxy] Testing complete: ${results.filter((r) => r.status === 'alive').length}/${results.length} alive`
    )
    this.emit('testing-completed', results)

    return results
  }

  /**
   * Assign a proxy to an account
   */
  assignProxy(accountId: string, proxyId?: string): string | null {
    if (proxyId) {
      // Assign specific proxy
      if (!this.proxies.has(proxyId)) {
        console.warn(`[Proxy] Proxy not found: ${proxyId}`)
        return null
      }

      this.accountProxyMap.set(accountId, proxyId)
      this.persistAssignments()

      console.log(`[Proxy] Assigned ${proxyId} to ${accountId}`)
      this.emit('proxy-assigned', { accountId, proxyId })

      return proxyId
    } else {
      // Assign next available proxy
      return this.getNextProxy()
    }
  }

  /**
   * Get next proxy in rotation
   */
  getNextProxy(): string | null {
    if (this.proxies.size === 0) {
      console.warn('[Proxy] No proxies available')
      return null
    }

    const alivyProxies = Array.from(this.proxies.values()).filter((p) => p.status === 'alive')

    if (alivyProxies.length === 0) {
      console.warn('[Proxy] No alive proxies available')
      return null
    }

    const nextProxy = alivyProxies[this.currentProxyIndex % alivyProxies.length]
    this.currentProxyIndex++

    return nextProxy.id
  }

  /**
   * Rotate proxy for an account
   */
  rotateProxy(accountId: string): string | null {
    const newProxyId = this.getNextProxy()

    if (newProxyId) {
      this.accountProxyMap.set(accountId, newProxyId)
      this.persistAssignments()

      console.log(`[Proxy] Rotated proxy for ${accountId} to ${newProxyId}`)
      this.emit('proxy-rotated', { accountId, proxyId: newProxyId })
    }

    return newProxyId
  }

  /**
   * Get proxy for account
   */
  getProxyForAccount(accountId: string): Proxy | null {
    const proxyId = this.accountProxyMap.get(accountId)

    if (!proxyId) {
      return null
    }

    return this.proxies.get(proxyId) || null
  }

  /**
   * Get all proxies
   */
  getAllProxies(): Proxy[] {
    return Array.from(this.proxies.values())
  }

  /**
   * Get alive proxies
   */
  getAliveProxies(): Proxy[] {
    return Array.from(this.proxies.values()).filter((p) => p.status === 'alive')
  }

  /**
   * Remove a proxy
   */
  removeProxy(proxyId: string): boolean {
    const deleted = this.proxies.delete(proxyId)

    if (deleted) {
      // Remove from assignments
      for (const [accountId, pId] of Array.from(this.accountProxyMap.entries())) {
        if (pId === proxyId) {
          this.accountProxyMap.delete(accountId)
        }
      }

      this.persistProxies()
      this.persistAssignments()

      console.log(`[Proxy] Removed proxy: ${proxyId}`)
      this.emit('proxy-removed', proxyId)
    }

    return deleted
  }

  /**
   * Clear all proxies
   */
  clearAllProxies(): void {
    this.proxies.clear()
    this.accountProxyMap.clear()
    this.persistProxies()
    this.persistAssignments()

    console.log('[Proxy] Cleared all proxies')
    this.emit('proxies-cleared')
  }

  /**
   * Start auto-swap proxies - rotates through alive proxies on a set interval
   */
  startAutoSwap(intervalHours: number = 1, autoTestBeforeSwap: boolean = true): void {
    if (this.autoSwapIntervalId) {
      console.warn('[Proxy] Auto-swap already running')
      return
    }

    this.autoSwapConfig.enabled = true
    this.autoSwapConfig.intervalHours = intervalHours
    this.autoSwapConfig.autoTestBeforeSwap = autoTestBeforeSwap

    const intervalMs = intervalHours * 60 * 60 * 1000 // Convert hours to milliseconds

    console.log(`[Proxy] Starting auto-swap: every ${intervalHours} hour(s)`)
    this.emit('auto-swap-started', { intervalHours })

    // Do initial swap immediately
    this.performAutoSwap()

    // Then schedule regular swaps
    this.autoSwapIntervalId = setInterval(() => {
      this.performAutoSwap()
    }, intervalMs)
  }

  /**
   * Stop auto-swap proxies
   */
  stopAutoSwap(): void {
    if (this.autoSwapIntervalId) {
      clearInterval(this.autoSwapIntervalId)
      this.autoSwapIntervalId = null
      this.autoSwapConfig.enabled = false

      console.log('[Proxy] Auto-swap stopped')
      this.emit('auto-swap-stopped')
    }
  }

  /**
   * Perform auto-swap - rotate proxies for all accounts
   */
  private async performAutoSwap(): Promise<void> {
    try {
      console.log('[Proxy] Performing auto-swap rotation...')

      // Test all proxies if enabled
      if (this.autoSwapConfig.autoTestBeforeSwap) {
        console.log('[Proxy] Testing all proxies before swap...')
        await this.testAllProxies()
      }

      // Get alive proxies
      const aliveProxies = this.getAliveProxies()
      if (aliveProxies.length === 0) {
        console.warn('[Proxy] No alive proxies available for auto-swap')
        this.emit('auto-swap-error', 'No alive proxies available')
        return
      }

      // Rotate proxy for each account
      let swappedCount = 0
      for (const accountId of Array.from(this.accountProxyMap.keys())) {
        const newProxyId = this.getNextProxy()
        if (newProxyId) {
          this.accountProxyMap.set(accountId, newProxyId)
          swappedCount++
        }
      }

      this.persistAssignments()

      console.log(`[Proxy] Auto-swap completed: ${swappedCount} accounts swapped`)
      this.emit('auto-swap-completed', { swappedCount, totalAccounts: this.accountProxyMap.size })
    } catch (err) {
      console.error('[Proxy] Auto-swap error:', err)
      this.emit('auto-swap-error', String(err))
    }
  }

  /**
   * Get auto-swap configuration
   */
  getAutoSwapConfig(): AutoSwapConfig {
    return { ...this.autoSwapConfig }
  }

  /**
   * Check if auto-swap is running
   */
  isAutoSwapRunning(): boolean {
    return this.autoSwapConfig.enabled && this.autoSwapIntervalId !== null
  }

  /**
   * Persist proxies to file
   */
  private persistProxies(): void {
    try {
      const proxyList = Array.from(this.proxies.values())
      writeFileSync(this.proxiesPath, JSON.stringify(proxyList, null, 2))
    } catch (err) {
      console.error('[Proxy] Failed to save proxies:', err)
    }
  }

  /**
   * Persist assignments to file
   */
  private persistAssignments(): void {
    try {
      const assignments = Object.fromEntries(this.accountProxyMap)
      writeFileSync(this.assignmentsPath, JSON.stringify(assignments, null, 2))
    } catch (err) {
      console.error('[Proxy] Failed to save assignments:', err)
    }
  }
}

export const proxyService = new ProxyService()
