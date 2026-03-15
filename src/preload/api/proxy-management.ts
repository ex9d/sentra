/**
 * Proxy Management Module API - Expose proxy management to renderer process
 */

import { invoke } from './invoke'
import { z } from 'zod'

export const proxyMgmtApi = {
  addProxies: (proxies: any[]) =>
    invoke(
      'proxy:add-proxies',
      z.object({
        success: z.boolean(),
        count: z.number().optional(),
        error: z.string().optional()
      }),
      proxies
    ),

  importProxies: (filePath: string) =>
    invoke(
      'proxy:import',
      z.object({
        success: z.boolean(),
        count: z.number().optional(),
        error: z.string().optional()
      }),
      filePath
    ),

  exportProxies: (filePath: string) =>
    invoke(
      'proxy:export',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      filePath
    ),

  testProxies: () =>
    invoke(
      'proxy:test-proxies',
      z.object({
        success: z.boolean(),
        results: z.any().optional(),
        error: z.string().optional()
      })
    ),

  getHealthyProxy: () =>
    invoke(
      'proxy:get-healthy',
      z.object({
        success: z.boolean(),
        proxy: z.any().optional(),
        error: z.string().optional()
      })
    ),

  assignProxyToSession: (sessionId: string) =>
    invoke(
      'proxy:assign-session',
      z.object({
        success: z.boolean(),
        session: z.any().optional(),
        error: z.string().optional()
      }),
      sessionId
    ),

  releaseSession: (sessionId: string) =>
    invoke(
      'proxy:release-session',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      sessionId
    ),

  getPoolState: () =>
    invoke(
      'proxy:get-state',
      z.object({
        success: z.boolean(),
        state: z.any().optional(),
        error: z.string().optional()
      })
    ),

  setConfiguration: (config: any) =>
    invoke(
      'proxy:set-config',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      config
    ),

  clearProxies: () =>
    invoke(
      'proxy:clear',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      })
    )
}
