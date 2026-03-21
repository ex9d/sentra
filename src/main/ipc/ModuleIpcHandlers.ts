import { ipcMain } from 'electron'
import { Logger } from '../modules/shared/logging/Logger'
import { AppError } from '../modules/shared/error/AppError'
import https from 'https'

/**
 * Module IPC Handlers - Provides IPC endpoints for production modules
 * 
 * Note: The actual module implementations are complex and require 
 * specific input types (Item, BrowserLaunchOptions, etc.). 
 * This handler provides basic status endpoints and can be extended
 * as needed with specific module initialization in main process.
 */

const logger = new Logger('ModuleIpcHandlers')

/**
 * Fetch free proxies from multiple sources using Node.js https module
 * Browser fetch won't work due to CORS restrictions
 */
async function fetchFreeProxies(): Promise<string[]> {
  const sources = [
    {
      name: 'proxy-list.download',
      fetch: async () => {
        return new Promise<string[]>((resolve, reject) => {
          https.get('https://www.proxy-list.download/api/v1/get?type=http', { timeout: 5000 }, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
              try {
                const json = JSON.parse(data)
                if (json.LISTA && Array.isArray(json.LISTA)) {
                  resolve(json.LISTA.slice(0, 10))
                } else {
                  resolve([])
                }
              } catch (e) {
                reject(e)
              }
            })
          }).on('error', reject)
        })
      }
    },
    {
      name: 'proxyscrape.com',
      fetch: async () => {
        return new Promise<string[]>((resolve, reject) => {
          https.get('https://api.proxyscrape.com/v2/?request=getproxies&format=textplain&timeout=5000&ssl=all&anonymity=all', { timeout: 5000 }, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
              const proxies = data.split('\n').filter((p: string) => p.trim().length > 0).slice(0, 10)
              resolve(proxies)
            })
          }).on('error', reject)
        })
      }
    }
  ]

  for (const source of sources) {
    try {
      const proxies = await source.fetch()
      if (proxies.length > 0) {
        logger.info(`Successfully fetched ${proxies.length} proxies from ${source.name}`)
        return proxies
      }
    } catch (error) {
      logger.warn(`Failed to fetch from ${source.name}:`, error)
    }
  }

  logger.warn('No free proxies available from any source')
  return []
}

/**
 * Register IPC handlers for production modules
 * Called from main process after modules are initialized
 */
export function registerModuleIpcHandlers(): void {
  logger.info('Registering production module IPC handlers')

  // ============================================================================
  // TRADING MODULE STATUS ENDPOINTS
  // ============================================================================

  ipcMain.handle('trading:health', async () => {
    try {
      return { success: true, status: 'trading module ready' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ============================================================================
  // BROWSER AUTOMATION MODULE STATUS ENDPOINTS
  // ============================================================================

  ipcMain.handle('browser:health', async () => {
    try {
      return { success: true, status: 'browser module ready' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ============================================================================
  // PROXY MANAGEMENT MODULE STATUS ENDPOINTS
  // ============================================================================

  ipcMain.handle('proxy-mgmt:health', async () => {
    try {
      return { success: true, status: 'proxy management module ready' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('proxy:fetchFreeProxies', async () => {
    try {
      const proxies = await fetchFreeProxies()
      if (proxies.length === 0) {
        return { success: false, error: 'No proxies available from any source', proxies: [] }
      }
      return { success: true, proxies }
    } catch (error: any) {
      logger.error('Failed to fetch free proxies:', error)
      return { success: false, error: error.message, proxies: [] }
    }
  })

  // ============================================================================
  // NOTE: USERNAME SNIPER HANDLERS ARE MANAGED BY SniperController
  // Do not register sniper handlers here - they are registered in SniperController.ts
  // ============================================================================

  logger.info('Module IPC handlers registered successfully')
}

