import { request, requestWithCsrf, safeRequest, safeFetchBuffer } from '@main/lib/request'
import { z } from 'zod'
import {
  assetDetailsSchema,
  recommendationsSchema,
  batchCatalogDetailsSchema,
  resellersResponseSchema,
  resaleDataSchema,
  CatalogItemDetail,
  ResellersResponse,
  AssetOwnersResponse
} from '@shared/ipc-schemas/avatar'
import { RobloxXMLParser, Instance } from '../../lib/xmlReader'
import { isBinaryRobloxFile, parseBinaryRobloxFile } from '../../lib/rbxmReader'

export class RobloxAssetService {
  static async getAssetDetails(cookie: string, assetId: number) {
    const [catalogDetails, economyDetails] = await Promise.allSettled([
      request(assetDetailsSchema, {
        url: `https:
        cookie
      }),
      request(assetDetailsSchema, {
        url: `https:
        cookie
      })
    ])

    const catalogData = catalogDetails.status === 'fulfilled' ? catalogDetails.value : {}
    const economyData = economyDetails.status === 'fulfilled' ? economyDetails.value : {}

    const collectibleLowestResalePrice =
      economyData.CollectiblesItemDetails?.CollectibleLowestResalePrice ?? null

    return {
      ...catalogData,
      ...economyData,
      name: catalogData.name || economyData.Name,
      description: catalogData.description || economyData.Description,
      price: catalogData.price ?? economyData.PriceInRobux,
      creatorName: catalogData.creatorName || economyData.Creator?.Name,
      creatorType: catalogData.creatorType || economyData.Creator?.CreatorType,
      creatorHasVerifiedBadge:
        catalogData.creatorHasVerifiedBadge || economyData.Creator?.HasVerifiedBadge,
      created: catalogData.itemCreatedUtc || economyData.Created,
      updated: economyData.Updated || catalogData.itemUpdatedUtc,
      isLimited:
        catalogData.isLimited ||
        economyData.IsLimited ||
        economyData.CollectiblesItemDetails?.IsLimited,
      isLimitedUnique: catalogData.isLimitedUnique || economyData.IsLimitedUnique,
      isForSale: catalogData.isPurchasable || economyData.IsForSale,
      collectibleLowestResalePrice
    }
  }

  static async getAssetHierarchy(assetId: number) {
    try {
      const buffer = await safeFetchBuffer(
        `https:
      )

      let dataModel: Instance

      if (isBinaryRobloxFile(buffer)) {
        dataModel = parseBinaryRobloxFile(buffer)
      } else {
        const content = buffer.toString('utf-8')
        const parser = new RobloxXMLParser()
        try {
          await parser.parse(content)
        } catch (parseError: any) {
          throw new Error(`Failed to parse XML: ${parseError.message}`)
        }
        dataModel = parser.dataModel
      }

      const serialize = (inst: Instance): any => ({
        class: inst.class,
        referent: inst.referent,
        properties: inst.properties,
        children: inst.children.map(serialize)
      })

      return serialize(dataModel)
    } catch (error: any) {
      console.error('[RobloxAssetService] Failed to fetch/parse asset hierarchy:', error)

      if (error.statusCode === 401) {
        throw new Error('This asset must be created by Roblox or yourself to view its hierarchy')
      }

      throw new Error(error.message || 'Failed to load asset hierarchy')
    }
  }










  static async getBatchAssetDetails(
    cookie: string,
    assetIds: number[],
    itemType: 'Asset' | 'Bundle' = 'Asset'
  ): Promise<CatalogItemDetail[]> {
    if (assetIds.length === 0) {
      return []
    }


    const BATCH_LIMIT = 120
    const chunks = this.chunkArray(assetIds, BATCH_LIMIT)
    const allResults: CatalogItemDetail[] = []

    for (const chunk of chunks) {
      try {
        const items = chunk.map((id) => ({
          itemType,
          id
        }))

        const response = await requestWithCsrf(batchCatalogDetailsSchema, {
          method: 'POST',
          url: 'https://catalog.roblox.com/v1/catalog/items/details',
          cookie,
          headers: {
            'Content-Type': 'application/json'
          },
          body: { items }
        })

        if (response.data) {
          allResults.push(...response.data)
        }
      } catch (error) {
        console.error('[RobloxAssetService] Failed to fetch batch asset details for chunk:', error)
      }
    }

    return allResults
  }

  static async getAssetRecommendations(cookie: string, assetId: number) {
    try {
      const details = await RobloxAssetService.getAssetDetails(cookie, assetId)
      const assetTypeId = details.AssetTypeId || details.assetType || 8

      return await request(recommendationsSchema, {
        url: `https:
        cookie
      })
    } catch (error) {
      console.warn('[RobloxAssetService] Failed to fetch recommendations:', error)
      return { data: [] }
    }
  }







  static async getAssetResellers(
    collectibleItemId: string,
    limit: number = 100,
    cursor?: string
  ): Promise<ResellersResponse> {
    try {
      let url = `https:
      if (cursor) {
        url += `&cursor=${cursor}`
      }

      return await request(resellersResponseSchema, {
        url,
        method: 'GET'
      })
    } catch (error) {
      console.warn('[RobloxAssetService] Failed to fetch resellers:', error)
      return { data: [] }
    }
  }









  static async getAssetOwners(
    cookie: string,
    assetId: number,
    limit: number = 100,
    sortOrder: 'Asc' | 'Desc' = 'Asc',
    cursor?: string
  ): Promise<AssetOwnersResponse> {
    try {
      let url = `https:
      if (cursor) {
        url += `&cursor=${cursor}`
      }

      const lenientOwnerSchema = z
        .object({
          id: z.number(),
          collectibleItemInstanceId: z.string().nullable().optional(),
          serialNumber: z.union([z.number(), z.null()]).optional(),
          owner: z
            .object({
              id: z.number(),
              type: z.string(),
              name: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
          created: z.string().optional(),
          updated: z.string().optional()
        })
        .passthrough()

      const lenientResponseSchema = z.object({
        data: z.array(lenientOwnerSchema),
        nextPageCursor: z.string().nullable().optional(),
        previousPageCursor: z.string().nullable().optional()
      })

      const rawData = await safeRequest<any>({
        url,
        method: 'GET',
        cookie
      })

      const result = lenientResponseSchema.parse(rawData)

      return result as AssetOwnersResponse
    } catch (error: any) {
      console.error('[RobloxAssetService] Failed to fetch asset owners:', error)
      if (error.issues) {
        console.error(
          '[RobloxAssetService] Zod validation issues:',
          JSON.stringify(error.issues, null, 2)
        )
      }
      return { data: [] }
    }
  }

  static async getResaleData(assetId: number) {
    return request(resaleDataSchema, {
      url: `https:
      method: 'GET'
    })
  }

  static async purchaseLimitedItem(
    cookie: string,
    collectibleItemInstanceId: string,
    expectedPrice: number,
    sellerId: number,
    productId: string
  ) {
    const purchaseResponseSchema = z
      .object({
        purchased: z.boolean().optional(),
        reason: z.string().optional(),
        productId: z.number().optional(),
        statusCode: z.number().optional(),
        title: z.string().optional(),
        errorMsg: z.string().optional(),
        showDivId: z.string().optional(),
        shortMessage: z.string().optional()
      })
      .passthrough()

    return requestWithCsrf(purchaseResponseSchema, {
      method: 'POST',
      url: `https:
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        expectedCurrency: 1,
        expectedPrice,
        expectedSellerId: sellerId,
        userAssetId: collectibleItemInstanceId
      }
    })
  }

  private static chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0 || items.length <= size) {
      return items.length ? [items.slice()] : []
    }

    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }
}