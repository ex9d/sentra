import { request } from '@main/lib/request'
import { z } from 'zod'
import { dialog, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { parseStringPromise } from 'xml2js'


const catalogSubcategorySchema = z.object({
  subcategory: z.string().nullable(),
  taxonomy: z.string(),
  assetTypeIds: z.array(z.number()),
  bundleTypeIds: z.array(z.number()),
  subcategoryId: z.number().nullable(),
  name: z.string(),
  shortName: z.string().nullable().optional()
})

const catalogCategorySchema = z.object({
  category: z.string(),
  taxonomy: z.string(),
  assetTypeIds: z.array(z.number()),
  bundleTypeIds: z.array(z.number()),
  categoryId: z.number(),
  name: z.string(),
  orderIndex: z.number(),
  subcategories: z.array(catalogSubcategorySchema),
  isSearchable: z.boolean()
})

const catalogNavigationMenuSchema = z.object({
  categories: z.array(catalogCategorySchema)
})


const catalogSearchItemSchema = z.object({
  id: z.number(),
  itemType: z.string(),
  assetType: z.number().optional(),
  bundleType: z.number().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  creatorName: z.string().optional(),
  creatorTargetId: z.number().optional(),
  creatorType: z.string().optional(),
  creatorHasVerifiedBadge: z.boolean().optional(),
  price: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  lowestResalePrice: z.number().nullable().optional(),
  priceStatus: z.string().optional(),
  favoriteCount: z.number().optional(),
  collectibleItemId: z.string().nullable().optional(),
  totalQuantity: z.number().nullable().optional(),
  hasResellers: z.boolean().optional(),
  offSaleDeadline: z.string().nullable().optional(),
  saleLocationType: z.string().optional(),
  itemStatus: z.array(z.string()).optional(),
  itemRestrictions: z.array(z.string()).optional(),
  unitsAvailableForConsumption: z.number().optional(),
  productId: z.number().optional()
})

const catalogSearchResponseSchema = z.object({
  keyword: z.string().nullable().optional(),
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(catalogSearchItemSchema)
})


const searchSuggestionSchema = z.object({
  Data: z.array(
    z.object({
      Query: z.string(),
      Score: z.number().optional()
    })
  )
})


export type CatalogCategory = z.infer<typeof catalogCategorySchema>
export type CatalogSubcategory = z.infer<typeof catalogSubcategorySchema>
export type CatalogSearchItem = z.infer<typeof catalogSearchItemSchema>
export type CatalogSearchResponse = z.infer<typeof catalogSearchResponseSchema>


export enum CatalogSortType {
  Relevance = 0,
  MostFavorited = 1,
  Bestselling = 2,
  RecentlyPublished = 3,
  PriceHighToLow = 4,
  PriceLowToHigh = 5
}


export enum CatalogSalesTypeFilter {
  All = 1,
  Collectibles = 2,
  Limited = 3
}

export interface CatalogSearchParams {
  keyword?: string
  taxonomy?: string
  subcategory?: string
  sortType?: CatalogSortType
  sortAggregation?: number
  salesTypeFilter?: CatalogSalesTypeFilter
  minPrice?: number
  maxPrice?: number
  creatorName?: string
  creatorType?: string
  limit?: number
  cursor?: string
  includeNotForSale?: boolean
}

export class RobloxCatalogService {



  static async getNavigationMenu(): Promise<CatalogCategory[]> {
    const result = await request(catalogNavigationMenuSchema, {
      url: 'https://catalog.roblox.com/v1/search/navigation-menu-items'
    })
    return result.categories
  }






  static async getSearchSuggestions(prefix: string, limit: number = 10): Promise<string[]> {
    try {
      const queryParams = new URLSearchParams({
        prefix,
        limit: String(limit),
        lang: 'en',
        q: prefix
      })

      const url = `https:

      const result = await request(searchSuggestionSchema, {
        url,
        method: 'GET'
      })

      return result.Data.map((item) => item.Query)
    } catch (error) {
      console.error('[RobloxCatalogService] Failed to get search suggestions:', error)
      return []
    }
  }






  static async searchCatalog(
    params: CatalogSearchParams,
    cookie?: string
  ): Promise<CatalogSearchResponse> {
    const queryParams = new URLSearchParams()


    queryParams.set('limit', String(params.limit || 120))


    if (params.taxonomy) {
      queryParams.set('taxonomy', params.taxonomy)
    }


    if (params.keyword && params.keyword.trim()) {
      queryParams.set('keyword', params.keyword.trim())
    }


    if (params.sortType !== undefined) {
      queryParams.set('sortType', String(params.sortType))
    }


    if (params.sortAggregation !== undefined) {
      queryParams.set('sortAggregation', String(params.sortAggregation))
    }


    if (params.salesTypeFilter !== undefined) {
      queryParams.set('salesTypeFilter', String(params.salesTypeFilter))
    }


    if (params.minPrice !== undefined) {
      queryParams.set('minPrice', String(params.minPrice))
    }
    if (params.maxPrice !== undefined) {
      queryParams.set('maxPrice', String(params.maxPrice))
    }


    if (params.creatorName) {
      queryParams.set('creatorName', params.creatorName)
    }
    if (params.creatorType) {
      queryParams.set('creatorType', params.creatorType)
    }


    if (params.cursor) {
      queryParams.set('cursor', params.cursor)
    }


    if (params.includeNotForSale) {
      queryParams.set('includeNotForSale', 'true')
    }

    const url = `https:

    try {
      const result = await request(catalogSearchResponseSchema, { url, cookie })
      return result
    } catch (error) {
      console.error('[RobloxCatalogService] Search failed:', error)
      throw error
    }
  }




  static async getItemThumbnails(
    items: Array<{ id: number; itemType: string }>
  ): Promise<Record<number, string>> {
    if (items.length === 0) return {}

    const assetIds = items.filter((i) => i.itemType === 'Asset').map((i) => i.id)
    const bundleIds = items.filter((i) => i.itemType === 'Bundle').map((i) => i.id)

    const thumbnails: Record<number, string> = {}


    if (assetIds.length > 0) {
      try {
        const assetChunks = this.chunk(assetIds, 100)
        for (const chunk of assetChunks) {
          const result = await request(
            z.object({
              data: z.array(
                z.object({
                  targetId: z.number(),
                  state: z.string(),
                  imageUrl: z.string().nullable()
                })
              )
            }),
            {
              url: `https:
            }
          )

          result.data.forEach((item) => {
            if (item.imageUrl) {
              thumbnails[item.targetId] = item.imageUrl
            }
          })
        }
      } catch (error) {
        console.error('[RobloxCatalogService] Failed to fetch asset thumbnails:', error)
      }
    }


    if (bundleIds.length > 0) {
      try {
        const bundleChunks = this.chunk(bundleIds, 100)
        for (const chunk of bundleChunks) {
          const result = await request(
            z.object({
              data: z.array(
                z.object({
                  targetId: z.number(),
                  state: z.string(),
                  imageUrl: z.string().nullable()
                })
              )
            }),
            {
              url: `https:
            }
          )

          result.data.forEach((item) => {
            if (item.imageUrl) {
              thumbnails[item.targetId] = item.imageUrl
            }
          })
        }
      } catch (error) {
        console.error('[RobloxCatalogService] Failed to fetch bundle thumbnails:', error)
      }
    }

    return thumbnails
  }

  private static chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    )
  }






  static async downloadShirtPantsTemplate(
    assetId: number,
    assetName: string,
    cookie?: string
  ): Promise<{ success: boolean; message?: string; path?: string }> {
    try {
      const cdnPath = 'https://assetdelivery.roblox.com/v1/asset/?id='
      const url = `${cdnPath}${assetId}`

      const headers: HeadersInit = {}
      if (cookie) {
        headers['Cookie'] = `.ROBLOSECURITY=${cookie}`
      }

      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error(`Failed to fetch asset XML: ${response.statusText}`)
      }
      const body = await response.text()

      if (!body.includes('ShirtTemplate') && !body.includes('PantsTemplate')) {
        return { success: false, message: 'Asset does not contain ShirtTemplate or PantsTemplate' }
      }

      const xmlResult = await parseStringPromise(body, { attrkey: 'ATTR' })


      const item = xmlResult?.roblox?.Item?.[0]
      const properties = item?.Properties?.[0]
      const content = properties?.Content?.[0]
      const imageUrlBeforeFix = content?.url?.[0]

      if (!imageUrlBeforeFix) {
        return { success: false, message: 'Could not find template URL in XML' }
      }

      if (imageUrlBeforeFix.includes('http://www.roblox.com/asset/?id=')) {
        const imageUrl = imageUrlBeforeFix.replace('http://www.roblox.com/asset/?id=', cdnPath)


        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save Template',
          defaultPath: path.join(
            app.getPath('downloads'),
            `${assetName.replace(/[^a-z0-9]/gi, '_')}_template.png`
          ),
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
        })

        if (canceled || !filePath) {
          return { success: false, message: 'Save canceled' }
        }

        const imageResponse = await fetch(imageUrl, { headers })
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch template image: ${imageResponse.statusText}`)
        }

        const arrayBuffer = await imageResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        await fs.promises.writeFile(filePath, buffer)

        return { success: true, path: filePath }
      } else {
        return { success: false, message: 'Template URL format not recognized' }
      }
    } catch (error) {
      console.error('[RobloxCatalogService] Failed to download template:', error)
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }
}