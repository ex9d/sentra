
import { invoke } from './invoke'
import { z } from 'zod'

// ============================================================================
// PROXY API
// ============================================================================

const successSchema = z.object({ success: z.boolean() })
const addProxySchema = z.object({ success: z.boolean(), proxy: z.any() })
const addListSchema = z.object({ success: z.boolean(), count: z.number(), proxies: z.array(z.any()) })
const testProxySchema = z.object({ success: z.boolean(), result: z.any() })
const testAllSchema = z.object({ success: z.boolean(), results: z.array(z.any()) })
const assignSchema = z.object({ success: z.boolean(), proxyId: z.string().optional() })
const nextProxySchema = z.object({ success: z.boolean(), proxyId: z.string().nullable() })
const rotateSchema = z.object({ success: z.boolean(), proxyId: z.string().nullable() })
const proxyForAccountSchema = z.object({ success: z.boolean(), proxy: z.any() })
const proxiesListSchema = z.object({ success: z.boolean(), proxies: z.array(z.any()) })
const aliveProxiesSchema = z.object({ success: z.boolean(), proxies: z.array(z.any()), count: z.number() })
const autoSwapConfigSchema = z.object({ success: z.boolean(), config: z.any() })
const autoSwapRunningSchema = z.object({ isRunning: z.boolean() })
const fetchFreeProxiesSchema = z.object({ success: z.boolean(), proxies: z.array(z.string()), error: z.string().optional() })

export const proxyApi = {
  addProxy: (host: string, port: number, username?: string, password?: string) =>
    invoke('proxy:add', addProxySchema, host, port, username, password),
  addProxyList: (proxyStrings: string[]) => invoke('proxy:add-list', addListSchema, proxyStrings),
  testProxy: (proxyId: string) => invoke('proxy:test', testProxySchema, proxyId),
  testAllProxies: () => invoke('proxy:test-all', testAllSchema),
  assignProxy: (accountId: string, proxyId?: string) => invoke('proxy:assign', assignSchema, accountId, proxyId),
  getNextProxy: () => invoke('proxy:get-next', nextProxySchema),
  rotateProxy: (accountId: string) => invoke('proxy:rotate', rotateSchema, accountId),
  getProxyForAccount: (accountId: string) => invoke('proxy:get-for-account', proxyForAccountSchema, accountId),
  getAllProxies: () => invoke('proxy:get-all', proxiesListSchema),
  getAliveProxies: () => invoke('proxy:get-alive', aliveProxiesSchema),
  removeProxy: (proxyId: string) => invoke('proxy:remove', successSchema, proxyId),
  clearAllProxies: () => invoke('proxy:clear-all', successSchema),

  // Auto-swap API
  startAutoSwap: (intervalHours: number, autoTestBeforeSwap?: boolean) =>
    invoke('proxy:start-auto-swap', autoSwapConfigSchema, intervalHours, autoTestBeforeSwap ?? true),
  stopAutoSwap: () => invoke('proxy:stop-auto-swap', successSchema),
  getAutoSwapConfig: () => invoke('proxy:get-auto-swap-config', autoSwapConfigSchema),
  isAutoSwapRunning: () => invoke('proxy:is-auto-swap-running', autoSwapRunningSchema),

  // Free proxy fetching
  fetchFreeProxies: () => invoke('proxy:fetchFreeProxies', fetchFreeProxiesSchema)
}
