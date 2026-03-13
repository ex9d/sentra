import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxCatalogService, CatalogSearchParams } from './CatalogService'

/**
 * Registers catalog-related IPC handlers
 */
export const registerCatalogHandlers = (): void => {
  // Get navigation menu (categories and subcategories)
  handle('get-catalog-navigation', z.tuple([]), async () => {
    return RobloxCatalogService.getNavigationMenu()
  })

  // Get search suggestions
  handle(
    'get-catalog-search-suggestions',
    z.tuple([z.string(), z.number().optional()]),
    async (_, prefix, limit) => {
      return RobloxCatalogService.getSearchSuggestions(prefix, limit)
    }
  )

  // Search catalog items (with optional cookie for authenticated requests)
  handle(
    'search-catalog-items',
    z.tuple([
      z.object({
        keyword: z.string().optional(),
        taxonomy: z.string().optional(),
        subcategory: z.string().optional(),
        sortType: z.number().optional(),
        sortAggregation: z.number().optional(),
        salesTypeFilter: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        creatorName: z.string().optional(),
        creatorType: z.string().optional(),
        limit: z.number().optional(),
        cursor: z.string().optional(),
        includeNotForSale: z.boolean().optional(),
        cookie: z.string().optional()
      })
    ]),
    async (_, params: CatalogSearchParams & { cookie?: string }) => {
      const { cookie, ...searchParams } = params
      return RobloxCatalogService.searchCatalog(searchParams, cookie)
    }
  )

  // Get item thumbnails
  handle(
    'get-catalog-thumbnails',
    z.tuple([
      z.array(
        z.object({
          id: z.number(),
          itemType: z.string()
        })
      )
    ]),
    async (_, items) => {
      return RobloxCatalogService.getItemThumbnails(items)
    }
  )

  // Download shirt/pants template
  handle(
    'download-catalog-template',
    z.tuple([z.number(), z.string(), z.string().optional()]),
    async (_, assetId, assetName, cookie) => {
      return RobloxCatalogService.downloadShirtPantsTemplate(assetId, assetName, cookie)
    }
  )
}
