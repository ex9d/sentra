/**
 * Trading Module API - Expose trading analyzer to renderer process
 */

import { invoke } from './invoke'
import { z } from 'zod'

export const tradingApi = {
  analyzeItem: (itemData: any) =>
    invoke(
      'trading:analyze-item',
      z.object({
        success: z.boolean(),
        analysis: z.any().optional(),
        error: z.string().optional()
      }),
      itemData
    ),

  makeTradingDecision: (itemData: any) =>
    invoke(
      'trading:make-decision',
      z.object({
        success: z.boolean(),
        decision: z.any().optional(),
        error: z.string().optional()
      }),
      itemData
    ),

  findOpportunities: (items: any[]) =>
    invoke(
      'trading:find-opportunities',
      z.object({
        success: z.boolean(),
        opportunities: z.array(z.any()).optional(),
        error: z.string().optional()
      }),
      items
    ),

  setConfiguration: (config: any) =>
    invoke(
      'trading:set-config',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      config
    ),

  getConfiguration: () =>
    invoke(
      'trading:get-config',
      z.object({
        success: z.boolean(),
        config: z.any().optional(),
        error: z.string().optional()
      })
    )
}
