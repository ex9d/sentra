/**
 * Browser Automation Module API - Expose browser automation to renderer process
 */

import { invoke } from './invoke'
import { z } from 'zod'

export const browserApi = {
  launch: (options?: any) =>
    invoke(
      'browser:launch',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      options
    ),

  navigate: (url: string, options?: any) =>
    invoke(
      'browser:navigate',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      url,
      options
    ),

  fillForm: (formConfig: any) =>
    invoke(
      'browser:fill-form',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      formConfig
    ),

  executeAutomation: (navigationConfig: any, formConfig: any) =>
    invoke(
      'browser:execute-automation',
      z.object({
        success: z.boolean(),
        result: z.any().optional(),
        error: z.string().optional()
      }),
      navigationConfig,
      formConfig
    ),

  waitForUserInteraction: (timeout?: number) =>
    invoke(
      'browser:wait-for-user',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      }),
      timeout
    ),

  completeUserInteraction: () =>
    invoke(
      'browser:complete-user',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      })
    ),

  screenshot: (path?: string) =>
    invoke(
      'browser:screenshot',
      z.object({
        success: z.boolean(),
        buffer: z.any().optional(),
        error: z.string().optional()
      }),
      path
    ),

  close: () =>
    invoke(
      'browser:close',
      z.object({
        success: z.boolean(),
        error: z.string().optional()
      })
    ),

  isAutomating: () =>
    invoke(
      'browser:is-automating',
      z.object({
        success: z.boolean(),
        isAutomating: z.boolean().optional()
      })
    )
}
