import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import { Account } from '@renderer/types'
import { avatar3DKeys } from '../hooks/useAvatar3DManifest'

// Map asset type IDs to string names used by the inventory API
const ASSET_TYPE_MAP: Record<number, string> = {
  2: 'TShirt',
  8: 'Hat',
  11: 'Shirt',
  12: 'Pants',
  17: 'Head',
  18: 'Face',
  19: 'Gear',
  41: 'HairAccessory',
  42: 'FaceAccessory',
  43: 'NeckAccessory',
  44: 'ShoulderAccessory',
  45: 'FrontAccessory',
  46: 'BackAccessory',
  47: 'WaistAccessory',
  61: 'EmoteAnimation',
  64: 'TShirtAccessory',
  65: 'ShirtAccessory',
  66: 'PantsAccessory',
  67: 'JacketAccessory',
  68: 'SweaterAccessory',
  69: 'ShortsAccessory',
  72: 'DressSkirtAccessory'
}

// Convert asset type IDs to string names
const mapAssetTypeIds = (ids: number[]): string[] => {
  return ids.map((id) => ASSET_TYPE_MAP[id]).filter(Boolean)
}

const headshotRefreshInFlight = new Set<number>()
const headshotLastRefreshAt = new Map<number, number>()

const refreshAccountAvatarHeadshot = async (
  queryClient: QueryClient,
  accountId: string,
  userId: string,
  size: string = '420x420',
  options?: { force?: boolean }
): Promise<void> => {
  const uid = Number.parseInt(userId, 10)
  if (!Number.isFinite(uid)) return

  const force = options?.force ?? false
  const now = Date.now()
  const minIntervalMs = 60 * 1000
  const last = headshotLastRefreshAt.get(uid) ?? 0
  if (!force && now - last < minIntervalMs) return
  if (headshotRefreshInFlight.has(uid)) return
  headshotRefreshInFlight.add(uid)

  try {
    const map = await window.api.getBatchUserAvatars([uid], size)
    const url = map[uid]
    if (!url) return

    queryClient.setQueryData(queryKeys.accounts.list(), (prev: Account[] | undefined) => {
      if (!prev) return prev
      let changed = false
      const next = prev.map((acc) => {
        if (acc.id !== accountId) return acc
        if (acc.avatarUrl === url) return acc
        changed = true
        return { ...acc, avatarUrl: url }
      })
      return changed ? next : prev
    })

    headshotLastRefreshAt.set(uid, now)
    queryClient.invalidateQueries({ queryKey: ['userAvatar', uid] })
    queryClient.invalidateQueries({ queryKey: queryKeys.thumbnails.userAvatars([uid], size) })
  } catch {
    // ignore avatar refresh errors
  } finally {
    headshotRefreshInFlight.delete(uid)
  }
}

interface AvatarAsset {
  id: number
  name: string
  assetType: { id: number; name: string }
  currentVersionId?: number
  meta?: { order?: number; puffiness?: number; version?: number }
}

interface InventoryItem {
  id: number
  name: string
  type: string
  imageUrl: string
}

interface AvatarState {
  assets: AvatarAsset[]
  bodyColors: Record<string, any> | null
  scales: Record<string, any> | null
  playerAvatarType: string | null
}

export function useCurrentAvatar(account: Account | null) {
  const cookie = account?.cookie
  const userId = account?.userId ? parseInt(account.userId) : undefined
  const accountId = account?.id || ''

  return useQuery({
    queryKey: queryKeys.avatar.current(accountId),
    queryFn: async (): Promise<AvatarState> => {
      const avatarData = await window.api.getCurrentAvatar(cookie!, userId)
      return {
        assets: avatarData.assets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          assetType: asset.assetType,
          currentVersionId: asset.currentVersionId,
          meta: asset.meta
        })),
        bodyColors: avatarData.bodyColors as Record<string, any> | null,
        scales: avatarData.scales as Record<string, any> | null,
        playerAvatarType: avatarData.playerAvatarType as string | null
      }
    },
    enabled: !!cookie && !!userId,
    staleTime: 30 * 1000
  })
}

export function useInventory(
  account: Account | null,
  assetTypeIds: number[],
  options?: { enabled?: boolean }
) {
  const cookie = account?.cookie
  const userId = account?.userId ? parseInt(account.userId) : undefined
  const accountId = account?.id || ''
  const primaryAssetTypeId = assetTypeIds[0] || 0

  return useQuery({
    queryKey: queryKeys.avatar.inventory(accountId, primaryAssetTypeId),
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!cookie || !userId) return []

      // Convert numeric asset type IDs to string names
      const assetTypes = mapAssetTypeIds(assetTypeIds)
      if (assetTypes.length === 0) return []

      const result = await window.api.getInventoryV2(
        cookie,
        userId,
        assetTypes,
        undefined, // cursor
        100, // limit
        'Desc' // sortOrder
      )

      if (!result.data || result.data.length === 0) return []

      const assetIds = result.data.map((item: any) => item.assetId)
      
      let thumbMap = new Map<number, string>()
      try {
        const thumbResponse = await window.api.getBatchThumbnails(assetIds)
        thumbMap = new Map(thumbResponse.data.map((t: any) => [t.targetId, t.imageUrl]))
      } catch (error) {
        console.error('[useInventory] Failed to fetch thumbnails:', error)
        // Continue without thumbnails rather than failing the entire query
      }

      return result.data.map((asset: any) => ({
        id: asset.assetId,
        name: asset.name || asset.assetName || asset.Name || 'Unknown Item',
        type: asset.assetType?.name || 'Unknown',
        imageUrl: (thumbMap.get(asset.assetId) as string) || ''
      }))
    },
    enabled: !!cookie && !!userId && assetTypeIds.length > 0 && (options?.enabled ?? true),
    staleTime: 60 * 1000 // 1 minute
  })
}

export function useUserOutfits(account: Account | null, isEditable: boolean) {
  const cookie = account?.cookie
  const userId = account?.userId ? parseInt(account.userId) : undefined
  const accountId = account?.id || ''

  return useQuery({
    queryKey: queryKeys.avatar.outfits(accountId, isEditable),
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!cookie || !userId) return []

      const response = await window.api.getUserOutfits(cookie, userId, isEditable, 1)

      if (!response.data || response.data.length === 0) return []

      const outfits = response.data
      const outfitIds = outfits.map((o: any) => o.id)

      let thumbMap = new Map<number, string>()
      try {
        const thumbResponse = await window.api.getBatchThumbnails(outfitIds, 'Outfit')
        thumbMap = new Map(thumbResponse.data.map((t: any) => [t.targetId, t.imageUrl]))
      } catch (error) {
        console.error('[useUserOutfits] Failed to fetch thumbnails:', error)
        // Continue without thumbnails rather than failing the entire query
      }

      return outfits.map((o: any) => ({
        id: o.id,
        name: o.name,
        type: isEditable ? 'Creation' : 'Purchased',
        imageUrl: thumbMap.get(o.id) || ''
      }))
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000
  })
}

export function useFavoriteItems() {
  return useQuery({
    queryKey: queryKeys.avatar.favorites(),
    queryFn: async (): Promise<InventoryItem[]> => {
      const favs = await window.api.getFavoriteItems()

      if (favs.length === 0) return []

      const assetIds = favs.map((f: any) => f.id)
      
      let thumbMap = new Map<number, string>()
      try {
        const thumbResponse = await window.api.getBatchThumbnails(assetIds)
        thumbMap = new Map(thumbResponse.data.map((t: any) => [t.targetId, t.imageUrl]))
      } catch (error) {
        console.error('[useFavoriteItems] Failed to fetch thumbnails:', error)
        // Continue without thumbnails rather than failing the entire query
      }

      return favs.map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        imageUrl: thumbMap.get(f.id) || f.imageUrl || ''
      }))
    },
    staleTime: 60 * 1000
  })
}

export function useAddFavoriteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: { id: number; name: string; type: string }) =>
      window.api.addFavoriteItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.favorites() })
    }
  })
}

export function useRemoveFavoriteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: number) => window.api.removeFavoriteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.favorites() })
    }
  })
}

export function useSetWearingAssets(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''
  const userId = account?.userId || ''

  return useMutation({
    mutationFn: (assets: AvatarAsset[]) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.setWearingAssets(cookie, assets)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.current(accountId) })
      if (userId) {
        queryClient.resetQueries({ queryKey: avatar3DKeys.manifest(userId) })
        void refreshAccountAvatarHeadshot(queryClient, accountId, userId, '420x420', {
          force: true
        })
      }
    }
  })
}

export function useWearOutfit(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''
  const userId = account?.userId || ''

  return useMutation({
    mutationFn: (outfitId: number) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.wearOutfit(cookie, outfitId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.current(accountId) })
      if (userId) {
        queryClient.resetQueries({ queryKey: avatar3DKeys.manifest(userId) })
        void refreshAccountAvatarHeadshot(queryClient, accountId, userId, '420x420', {
          force: true
        })
      }
    }
  })
}

export function useSetBodyColors(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''
  const userId = account?.userId || ''

  return useMutation({
    mutationFn: (bodyColors: any) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.setBodyColors(cookie, bodyColors)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.current(accountId) })
      if (userId) {
        queryClient.resetQueries({ queryKey: avatar3DKeys.manifest(userId) })
        void refreshAccountAvatarHeadshot(queryClient, accountId, userId, '420x420', {
          force: true
        })
      }
    }
  })
}

export function useSetAvatarScales(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''
  const userId = account?.userId || ''

  return useMutation({
    mutationFn: (scales: {
      height: number
      width: number
      head: number
      proportion: number
      bodyType: number
    }) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.setAvatarScales(cookie, scales)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.current(accountId) })
      if (userId) {
        queryClient.resetQueries({ queryKey: avatar3DKeys.manifest(userId) })
        void refreshAccountAvatarHeadshot(queryClient, accountId, userId, '420x420', {
          force: true
        })
      }
    }
  })
}

export function useSetPlayerAvatarType(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''
  const userId = account?.userId || ''

  return useMutation({
    mutationFn: (avatarType: 'R6' | 'R15') => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.setPlayerAvatarType(cookie, avatarType)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.current(accountId) })
      if (userId) {
        queryClient.resetQueries({ queryKey: avatar3DKeys.manifest(userId) })
        void refreshAccountAvatarHeadshot(queryClient, accountId, userId, '420x420', {
          force: true
        })
      }
    }
  })
}

export function useUpdateOutfit(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''

  return useMutation({
    mutationFn: ({ outfitId, details }: { outfitId: number; details: any }) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.updateOutfit(cookie, outfitId, details)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.outfits(accountId, true) })
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.outfits(accountId, false) })
    }
  })
}

export function useDeleteOutfit(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie
  const accountId = account?.id || ''

  return useMutation({
    mutationFn: (outfitId: number) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.deleteOutfit(cookie, outfitId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.outfits(accountId, true) })
      queryClient.invalidateQueries({ queryKey: queryKeys.avatar.outfits(accountId, false) })
    }
  })
}
