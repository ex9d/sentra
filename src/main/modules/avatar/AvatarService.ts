import { request, requestWithCsrf, safeRequest } from '@main/lib/request'
import { z } from 'zod'
import {
  userOutfitCollectionSchema,
  outfitDetailsSchema,
  avatarStateSchema,
  thumbnailBatchSchema,
  thumbnailEntrySchema,
  wearingAssetsResultSchema,
  updateOutfitResultSchema,
  assetDetailsSchema,
  recommendationsSchema,
  batchCatalogDetailsSchema,
  resellersResponseSchema,
  resaleDataSchema,
  catalogSearchResponseSchema,
  inventoryPageSchema,
  collectiblesSchema,
  OutfitDetails,
  CatalogItemDetail,
  CatalogSearchResponse,
  ResellersResponse,
  AssetOwnersResponse
} from '@shared/ipc-schemas/avatar'


const avatarRenderResponseSchema = z.object({
  targetId: z.number(),
  state: z.string(),
  imageUrl: z.string(),
  version: z.string().optional()
})

const BODY_COLOR_BASE_KEYS = [
  'headColor',
  'torsoColor',
  'rightArmColor',
  'leftArmColor',
  'rightLegColor',
  'leftLegColor'
] as const



const BRICK_COLOR_TO_HEX: Record<number, string> = {
  1: 'F2F3F3',
  5: 'D7C59A',
  9: 'E8BAC8',
  18: 'CC8E69',
  21: 'C4281C',
  23: '0D69AC',
  24: 'F5CD30',
  26: '1B2A35',
  28: '287F47',
  29: 'A1C48C',
  37: '4B974B',
  38: 'AA5500',
  45: 'B4D2E4',
  101: 'DA867A',
  102: '6E99CA',
  104: '6B327C',
  105: 'E29B40',
  106: 'DA8541',
  107: '008F9C',
  119: 'A4BD47',
  125: 'EAB892',
  135: '74869D',
  141: '27462D',
  151: '789082',
  153: '957977',
  192: '694028',
  194: 'A3A2A5',
  199: '635F62',
  208: 'E5E4DF',
  217: '7C5C46',
  226: 'FDEA8D',
  1001: 'F8F8F8',
  1002: 'CDCDCD',
  1003: '111111',
  1004: 'FF0000',
  1005: 'FFB000',
  1006: 'B480FF',
  1007: '9F8660',
  1008: 'C1BE42',
  1009: 'FFFF00',
  1010: '0000FF',
  1011: '002060',
  1012: '2154B9',
  1013: 'A86F99',
  1014: 'AA5599',
  1015: 'AA00AA',
  1016: '993399',
  1017: 'FFCC00',
  1018: '006400',
  1019: '00FFFF',
  1020: '00FF00',
  1021: '3A7D15',
  1022: '7F8E64',
  1023: 'E8E8E8',
  1024: 'AFDDFF',
  1025: 'FFC9C9',
  1026: 'B1A7FF',
  1027: '9FF3E9',
  1028: 'CCFFCC',
  1029: 'FFFFCC',
  1030: 'FFCC99',
  1031: '6C584C',
  1032: 'FF9494'
}





function brickColorToHex(brickColorId: number): string | undefined {
  return BRICK_COLOR_TO_HEX[brickColorId]
}

type ThumbnailEntry = z.infer<typeof thumbnailEntrySchema>

export class RobloxAvatarService {
  private static THUMBNAIL_BATCH_LIMIT = 100
  private static thumbnailChunkPromises = new Map<string, Promise<ThumbnailEntry[]>>()

  static async getInventory(
    cookie: string,
    userId: number,
    assetTypeId: number,
    cursor?: string,
    limit: number = 100
  ) {
    let url = `https:
    if (cursor) {
      url += `&cursor=${cursor}`
    }

    return request(inventoryPageSchema, {
      url,
      cookie
    })
  }

  static async getCollectibles(_cookie: string, userId: number) {
    try {
      const url = `https:
      return await request(collectiblesSchema, {
        url,
        method: 'GET'
      })
    } catch (error: any) {
      console.warn(`Failed to fetch collectibles for user ${userId}:`, error.message)
      return []
    }
  }

  static async getOutfits(
    cookie: string,
    userId: number,
    isEditable: boolean = false,
    page: number = 1,
    itemsPerPage: number = 25
  ) {
    return request(userOutfitCollectionSchema, {
      url: `https:
      cookie
    })
  }

  static async wearOutfit(cookie: string, outfitId: number): Promise<{ success: boolean }> {
    const outfit = await RobloxAvatarService.getOutfitDetails(cookie, outfitId)

    if (!outfit) {
      throw new Error(`Unable to load outfit ${outfitId}`)
    }

    if (outfit.playerAvatarType) {
      await RobloxAvatarService.postAvatarMutation(cookie, '/v1/avatar/set-player-avatar-type', {
        playerAvatarType: outfit.playerAvatarType
      })
    }

    const bodyColorPayload = RobloxAvatarService.buildBodyColorsPayload(outfit.bodyColors)
    if (bodyColorPayload) {
      await RobloxAvatarService.postAvatarMutation(
        cookie,
        '/v1/avatar/set-body-colors',
        bodyColorPayload
      )
    }

    if (outfit.scale && typeof outfit.scale === 'object') {
      await RobloxAvatarService.postAvatarMutation(
        cookie,
        '/v1/avatar/set-scales',
        outfit.scale as Record<string, unknown>
      )
    }


    if (outfit.assets && outfit.assets.length > 0) {
      const assetsPayload = outfit.assets.map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        assetType: {
          id: asset.assetType?.id,
          name: asset.assetType?.name
        },
        ...(asset.currentVersionId ? { currentVersionId: asset.currentVersionId } : {}),
        ...(asset.meta ? { meta: asset.meta } : {})
      }))

      await requestWithCsrf(wearingAssetsResultSchema, {
        method: 'POST',
        url: 'https://avatar.roblox.com/v2/avatar/set-wearing-assets',
        cookie,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          assets: assetsPayload
        }
      })
    }

    return { success: true }
  }

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
      collectibleLowestResalePrice,
      collectibleProductId: catalogData.collectibleProductId || economyData.CollectibleProductId,
      collectibleItemId: catalogData.collectibleItemId || economyData.CollectibleItemId
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
        console.error('[RobloxAvatarService] Failed to fetch batch asset details for chunk:', error)

      }
    }

    return allResults
  }

  static async getAssetRecommendations(cookie: string, assetId: number) {
    try {

      const details = await RobloxAvatarService.getAssetDetails(cookie, assetId)
      const assetTypeId = details.AssetTypeId || details.assetType || 8

      return await request(recommendationsSchema, {

        url: `https:
        cookie
      })
    } catch (error) {
      console.warn('[RobloxAvatarService] Failed to fetch recommendations:', error)
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
      console.warn('[RobloxAvatarService] Failed to fetch resellers:', error)
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
      console.error('[RobloxAvatarService] Failed to fetch asset owners:', error)
      if (error.issues) {
        console.error(
          '[RobloxAvatarService] Zod validation issues:',
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









  static async searchCatalog(
    keyword: string,
    limit: number = 30,
    creatorName?: string
  ): Promise<CatalogSearchResponse> {
    try {

      const params = new URLSearchParams({
        keyword,
        limit: Math.min(limit, 120).toString(),
        includeNotForSale: 'true',
        salesTypeFilter: '1'
      })


      if (creatorName) {
        params.append('creatorName', creatorName)
      }

      const url = `https:

      return await request(catalogSearchResponseSchema, {
        url,
        method: 'GET'
      })
    } catch (error) {
      console.error('[RobloxAvatarService] Failed to search catalog:', error)
      return { data: [] }
    }
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










  static async purchaseCatalogItem(
    cookie: string,
    collectibleItemId: string,
    expectedPrice: number,
    expectedSellerId: number,
    collectibleProductId?: string,
    expectedPurchaserId?: string,
    idempotencyKey?: string
  ) {

    const purchaseResponseSchema = z
      .object({
        purchaseResult: z.string().optional(),
        purchased: z.boolean(),
        pending: z.boolean().optional(),
        errorMessage: z.string().nullable().optional(),
        reason: z.string().optional(),
        statusCode: z.number().optional()
      })
      .passthrough()

    const body: Record<string, any> = {
      collectibleItemId,
      expectedCurrency: 1,
      expectedPrice,
      expectedSellerId,
      expectedSellerType: 'User'
    }

    if (collectibleProductId) body.collectibleProductId = collectibleProductId
    if (expectedPurchaserId) {
      body.expectedPurchaserId = expectedPurchaserId
      body.expectedPurchaserType = 'User'
    }
    if (idempotencyKey) body.idempotencyKey = idempotencyKey


    return requestWithCsrf(purchaseResponseSchema, {
      method: 'POST',
      url: `https:
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }

  static async getOutfitDetails(cookie: string, outfitId: number) {
    return request(outfitDetailsSchema, {
      url: `https:
      cookie
    })
  }

  static async updateOutfit(cookie: string, outfitId: number, details: Partial<OutfitDetails>) {
    const payload = RobloxAvatarService.buildOutfitPayload(details)

    const response = await requestWithCsrf(updateOutfitResultSchema, {
      method: 'PATCH',
      url: `https:
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    })

    return {
      ...response,
      success: response.success
    }
  }

  static async deleteOutfit(cookie: string, outfitId: number): Promise<{ success: boolean }> {
    try {
      await requestWithCsrf(z.object({ success: z.boolean().optional() }), {
        method: 'POST',
        url: `https:
        cookie,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return { success: true }
    } catch (error: any) {
      console.error(`Failed to delete outfit ${outfitId}:`, error)
      if (error.body) {
        console.error('Error body:', error.body)
      }
      return { success: false }
    }
  }

  static async getCurrentAvatar(cookie: string, userId?: number) {
    const url = userId
      ? `https:
      : 'https://avatar.roblox.com/v1/avatar'

    return request(avatarStateSchema, {
      url,
      cookie
    })
  }







  static async setWearingAssets(
    cookie: string,
    assets: Array<{
      id: number
      name: string
      assetType: { id: number; name: string }
      currentVersionId?: number
      meta?: { order?: number; puffiness?: number; version?: number }
    }>
  ) {

    const assetsPayload = assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      assetType: {
        id: asset.assetType.id,
        name: asset.assetType.name
      },
      ...(asset.currentVersionId ? { currentVersionId: asset.currentVersionId } : {}),
      ...(asset.meta ? { meta: asset.meta } : {})
    }))

    const requestBody = { assets: assetsPayload }

    const response = await requestWithCsrf(wearingAssetsResultSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v2/avatar/set-wearing-assets',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    })

    return response
  }





  static async setWearingAssetsLegacy(cookie: string, assetIds: number[]) {
    return requestWithCsrf(wearingAssetsResultSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v1/avatar/set-wearing-assets',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        assetIds
      }
    })
  }

  static async getBatchThumbnails(
    targetIds: number[],
    size: string = '420x420',
    format: string = 'png',
    type: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon' = 'Asset'
  ) {
    const resolvedType = type ?? 'Asset'
    const resolvedSize =
      resolvedType === 'BadgeIcon' || resolvedType === 'GroupIcon' ? '150x150' : size
    const resolvedFormat =
      resolvedType === 'BadgeIcon' || resolvedType === 'GroupIcon' ? 'Png' : format
    const sanitizedIds = Array.from(
      new Set(
        (targetIds || []).filter(
          (id): id is number => typeof id === 'number' && Number.isFinite(id)
        )
      )
    )

    if (sanitizedIds.length === 0) {
      return { data: [] }
    }

    const cacheNamespace = `${resolvedType}|${resolvedSize}|${resolvedFormat}`
    const entryMap = new Map<number, ThumbnailEntry>()


    const chunks = this.chunkArray(sanitizedIds, this.THUMBNAIL_BATCH_LIMIT)
    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        this.fetchThumbnailChunk(cacheNamespace, chunk, resolvedType, resolvedSize, resolvedFormat)
      )
    )

    chunkResults.forEach((entries) => {
      entries.forEach((entry) => {
        entryMap.set(entry.targetId, entry)
      })
    })

    const orderedData = sanitizedIds
      .map((id) => entryMap.get(id))
      .filter((entry): entry is ThumbnailEntry => Boolean(entry))

    return { data: orderedData }
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

  private static async fetchThumbnailChunk(
    namespace: string,
    ids: number[],
    type: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon',
    size: string,
    format: string
  ): Promise<ThumbnailEntry[]> {
    if (ids.length === 0) {
      return []
    }

    const chunkKey = `thumbnail-chunk|${namespace}|${ids.join(',')}`
    if (this.thumbnailChunkPromises.has(chunkKey)) {
      return this.thumbnailChunkPromises.get(chunkKey)!
    }

    const promise = (async () => {
      const requests = ids.map((id) => ({
        requestId: `req_${id}`,
        targetId: id,
        type,
        size,
        format,
        isCircular: false
      }))

      const response = await request(thumbnailBatchSchema, {
        method: 'POST',
        url: 'https://thumbnails.roblox.com/v1/batch',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requests
      })

      return response.data || []
    })()

    this.thumbnailChunkPromises.set(chunkKey, promise)

    try {
      return await promise
    } finally {
      this.thumbnailChunkPromises.delete(chunkKey)
    }
  }

  private static buildOutfitPayload(details: Partial<OutfitDetails>): Record<string, any> {
    const payload: Record<string, any> = {}
    if (!details) {
      throw new Error('No outfit details supplied for update')
    }

    if (typeof details.name === 'string') {
      payload.name = details.name
    }

    if (details.playerAvatarType) {
      payload.playerAvatarType = details.playerAvatarType
    }

    if (details.bodyColors) {
      const bodyColorIds = RobloxAvatarService.extractBodyColorIds(details.bodyColors)
      const bodyColor3s = RobloxAvatarService.extractBodyColor3s(details.bodyColors)

      if (bodyColorIds) {
        payload.bodyColors = bodyColorIds
      } else {
        payload.bodyColors = details.bodyColors
      }

      if (bodyColor3s) {
        payload.bodyColor3s = bodyColor3s
      }
    }

    const scale = (details as any).scale || (details as any).scales
    if (scale) {
      payload.scale = scale
    }

    const rawAssets = (details as any).assets
    if (Array.isArray(rawAssets)) {
      payload.assetIds = RobloxAvatarService.extractAssetIds(rawAssets)
      const assets = RobloxAvatarService.normalizeAssets(rawAssets)
      if (assets) {
        payload.assets = assets
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Outfit update payload was empty. Provide at least one field to change.')
    }

    return payload
  }

  private static normalizeAssets(
    assets?: Array<{
      id?: number
      assetId?: number
      assetTypeId?: number
      assetType?: { id?: number }
    }>
  ): { id: number; assetTypeId: number }[] | undefined {
    if (!assets || !Array.isArray(assets)) {
      return undefined
    }

    const normalized = assets
      .map((asset) => {
        if (!asset) return null
        const id =
          typeof asset.id === 'number'
            ? asset.id
            : typeof asset.assetId === 'number'
              ? asset.assetId
              : undefined

        const assetTypeId =
          typeof asset.assetTypeId === 'number'
            ? asset.assetTypeId
            : typeof asset.assetType?.id === 'number'
              ? asset.assetType.id
              : undefined

        if (id === undefined || assetTypeId === undefined) {
          return null
        }

        return { id, assetTypeId }
      })
      .filter((entry): entry is { id: number; assetTypeId: number } => entry !== null)

    return normalized.length > 0 ? normalized : undefined
  }

  private static extractAssetIds(assets?: { id?: number; assetId?: number }[]): number[] {
    if (!assets || !Array.isArray(assets)) return []

    const ids = assets
      .map((asset) => {
        if (!asset) return undefined
        if (typeof asset.id === 'number') return asset.id
        if (typeof asset.assetId === 'number') return asset.assetId
        return undefined
      })
      .filter((id): id is number => typeof id === 'number')


    return Array.from(new Set(ids))
  }

  private static buildBodyColorsPayload(
    bodyColors: any
  ): Record<string, number | string> | undefined {
    const ids = RobloxAvatarService.extractBodyColorIds(bodyColors)
    const color3s = RobloxAvatarService.extractBodyColor3s(bodyColors)

    if (!ids && !color3s) {
      return undefined
    }

    return {
      ...(ids || {}),
      ...(color3s || {})
    }
  }

  private static extractBodyColorIds(bodyColors: any): Record<string, number> | undefined {
    if (!bodyColors || typeof bodyColors !== 'object') {
      return undefined
    }

    const payload: Record<string, number> = {}

    BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
      const normalizedKey = `${baseKey}Id`
      const value = RobloxAvatarService.resolveBodyColorId(bodyColors, baseKey)
      if (typeof value === 'number') {
        payload[normalizedKey] = value
      }
    })

    return Object.keys(payload).length > 0 ? payload : undefined
  }

  private static extractBodyColor3s(bodyColors: any): Record<string, string> | undefined {
    if (!bodyColors || typeof bodyColors !== 'object') {
      return undefined
    }

    const payload: Record<string, string> = {}

    BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
      const normalizedKey = `${baseKey}3`
      const value = RobloxAvatarService.resolveBodyColor3(bodyColors, baseKey)
      if (typeof value === 'string') {
        payload[normalizedKey] = value
      }
    })

    const nestedBodyColor3s = bodyColors.bodyColor3s
    if (nestedBodyColor3s && typeof nestedBodyColor3s === 'object') {
      BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
        const normalizedKey = `${baseKey}3`
        const value = nestedBodyColor3s[normalizedKey]
        if (typeof value === 'string') {
          payload[normalizedKey] = RobloxAvatarService.normalizeColor3(value)
        }
      })
    }

    return Object.keys(payload).length > 0 ? payload : undefined
  }

  private static resolveBodyColorId(
    bodyColors: any,
    baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
  ): number | undefined {
    const directKey = `${baseKey}Id`
    if (typeof bodyColors[directKey] === 'number') {
      return bodyColors[directKey]
    }

    const altKey = `${baseKey}ID`
    if (typeof bodyColors[altKey] === 'number') {
      return bodyColors[altKey]
    }

    const nested = bodyColors[baseKey]
    if (nested && typeof nested === 'object') {
      const idCandidates = [
        nested.id,
        nested.Id,
        nested.brickColorId,
        nested.BrickColorId,
        nested.value,
        nested.Value
      ]

      const match = idCandidates.find((val) => typeof val === 'number')
      if (typeof match === 'number') {
        return match
      }
    }

    return undefined
  }

  private static resolveBodyColor3(
    bodyColors: any,
    baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
  ): string | undefined {
    const directKey = `${baseKey}3`
    if (typeof bodyColors[directKey] === 'string') {
      return RobloxAvatarService.normalizeColor3(bodyColors[directKey])
    }

    const nested = bodyColors[baseKey]
    if (nested && typeof nested === 'object') {
      const colorCandidates = [
        nested.color3,
        nested.Color3,
        nested.hexColor,
        nested.HexColor,
        nested.hex,
        nested.Hex,
        nested.color,
        nested.Color
      ]

      const match = colorCandidates.find((val) => typeof val === 'string')
      if (typeof match === 'string') {
        return RobloxAvatarService.normalizeColor3(match)
      }
    }

    return undefined
  }

  private static normalizeColor3(color: string): string {
    const trimmed = color.trim()
    if (trimmed.startsWith('#')) {
      return trimmed.slice(1).toUpperCase()
    }
    return trimmed.toUpperCase()
  }

  private static postAvatarMutation(
    cookie: string,
    path: string,
    body: Record<string, unknown>
  ): Promise<any> {

    return requestWithCsrf(z.object({ success: z.boolean() }), {
      method: 'POST',
      url: `https:
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }

  static async setBodyColors(cookie: string, bodyColors: any) {

    const payload: Record<string, string> = {}

    for (const baseKey of BODY_COLOR_BASE_KEYS) {
      const color3Key = `${baseKey}3`


      let hexColor: string | undefined


      if (typeof bodyColors[color3Key] === 'string') {
        hexColor = bodyColors[color3Key]
      } else if (typeof bodyColors[baseKey] === 'string') {
        hexColor = bodyColors[baseKey]
      }

      if (hexColor) {

        payload[color3Key] = hexColor.replace('#', '').toLowerCase()
      }
    }


    const finalPayload = Object.keys(payload).length > 0 ? payload : bodyColors


    return this.postAvatarMutation(cookie, '/v2/avatar/set-body-colors', finalPayload)
  }







  static async setAvatarScales(
    cookie: string,
    scales: {
      height: number
      width: number
      head: number
      proportion: number
      bodyType: number
    }
  ) {
    return this.postAvatarMutation(cookie, '/v1/avatar/set-scales', scales)
  }







  static async setPlayerAvatarType(cookie: string, playerAvatarType: 'R6' | 'R15') {
    return this.postAvatarMutation(cookie, '/v1/avatar/set-player-avatar-type', {
      playerAvatarType
    })
  }





  static async renderAvatarWithAsset(
    cookie: string,
    userId: number,
    assetIdToTryOn: number
  ): Promise<{ imageUrl: string; renderType: '2d' | '3d' }> {

    const currentAvatar = await this.getCurrentAvatar(cookie, userId)


    const existingAssetIds = currentAvatar.assets?.map((a: any) => a.id) || []
    const allAssetIds = [...new Set([...existingAssetIds, assetIdToTryOn])]
    const assetsPayload = allAssetIds.map((id) => ({ id }))
    const bodyColors: Record<string, string> = {}

    if (currentAvatar.bodyColors) {
      const bc = currentAvatar.bodyColors as any

      const colorMappings = [
        { key: 'headColor', color3Key: 'headColor3', colorIdKey: 'headColorId' },
        { key: 'torsoColor', color3Key: 'torsoColor3', colorIdKey: 'torsoColorId' },
        { key: 'leftArmColor', color3Key: 'leftArmColor3', colorIdKey: 'leftArmColorId' },
        { key: 'rightArmColor', color3Key: 'rightArmColor3', colorIdKey: 'rightArmColorId' },
        { key: 'leftLegColor', color3Key: 'leftLegColor3', colorIdKey: 'leftLegColorId' },
        { key: 'rightLegColor', color3Key: 'rightLegColor3', colorIdKey: 'rightLegColorId' }
      ]

      for (const mapping of colorMappings) {
        let hexColor: string | undefined


        if (bc[mapping.color3Key]) {
          hexColor = String(bc[mapping.color3Key]).replace('#', '').toUpperCase()
        }

        else if (bc.bodyColor3s && bc.bodyColor3s[mapping.color3Key]) {
          hexColor = String(bc.bodyColor3s[mapping.color3Key]).replace('#', '').toUpperCase()
        }

        else if (typeof bc[mapping.colorIdKey] === 'number') {
          hexColor = brickColorToHex(bc[mapping.colorIdKey])
        }

        if (hexColor) {
          bodyColors[mapping.key] = hexColor
        }
      }
    }


    const defaultColor = 'FFFFCC'
    const requiredColors = [
      'headColor',
      'torsoColor',
      'leftArmColor',
      'rightArmColor',
      'leftLegColor',
      'rightLegColor'
    ]
    for (const colorKey of requiredColors) {
      if (!bodyColors[colorKey]) {
        bodyColors[colorKey] = defaultColor
      }
    }


    const scales: Record<string, number> = {
      height: 1,
      width: 1,
      head: 1,
      depth: 1,
      proportion: 0,
      bodyType: 0
    }
    if (currentAvatar.scales) {
      const s = currentAvatar.scales as any
      if (typeof s.height === 'number') scales.height = s.height
      if (typeof s.width === 'number') scales.width = s.width
      if (typeof s.head === 'number') scales.head = s.head
      if (typeof s.depth === 'number') scales.depth = s.depth
      if (typeof s.proportion === 'number') scales.proportion = s.proportion
      if (typeof s.bodyType === 'number') scales.bodyType = s.bodyType
    }


    const playerAvatarType = currentAvatar.playerAvatarType || 'R6'


    const payload = {
      thumbnailConfig: {
        thumbnailId: userId,
        thumbnailType: '3d',
        size: '420x420'
      },
      avatarDefinition: {
        assets: assetsPayload,
        bodyColors,
        scales,
        playerAvatarType: {
          playerAvatarType
        }
      }
    }


    const renderResponse = await requestWithCsrf(avatarRenderResponseSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v1/avatar/render',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    })

    let finalImageUrl = renderResponse.imageUrl
    let finalState = renderResponse.state


    if (finalState === 'Completed' && finalImageUrl) {
      return this.normalizeRenderResult(finalImageUrl)
    }


    const maxAttempts = 20
    const pollInterval = 1000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval)

      try {
        const statusResponse = await request(avatarRenderResponseSchema, {
          method: 'POST',
          url: 'https://avatar.roblox.com/v1/avatar/render',
          cookie,
          headers: {
            'Content-Type': 'application/json'
          },
          body: payload
        })

        finalState = statusResponse.state
        if (statusResponse.imageUrl) {
          finalImageUrl = statusResponse.imageUrl
        }

        if (statusResponse.state === 'Completed' && finalImageUrl) {
          break
        }

        if (statusResponse.state === 'Error') {
          throw new Error('Avatar render failed')
        }
      } catch (renderPollError: any) {

        if (renderPollError.statusCode !== 403) {
          console.warn('[RobloxAvatarService] Render poll error:', renderPollError)
        }
      }
    }

    if (!finalImageUrl) {
      throw new Error('Avatar render timed out')
    }

    return this.normalizeRenderResult(finalImageUrl)
  }

  private static normalizeRenderResult(imageUrl: string): {
    imageUrl: string
    renderType: '2d' | '3d'
  } {
    const is3D = this.is3DManifestUrl(imageUrl)
    return { imageUrl, renderType: is3D ? '3d' : '2d' }
  }

  private static is3DManifestUrl(imageUrl: string) {
    const normalized = imageUrl.toLowerCase()
    return (
      normalized.endsWith('.json') ||
      normalized.includes('avatar-3d') ||
      normalized.includes('thumbnail-3d')
    )
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}