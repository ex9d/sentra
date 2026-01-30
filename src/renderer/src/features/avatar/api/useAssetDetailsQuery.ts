import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { queryKeys } from '@shared/queryKeys'
import {
  AssetDetails,
  RecommendationItem,
  assetDetailsSchema,
  recommendationsSchema,
  thumbnailBatchSchema
} from '@shared/ipc-schemas/avatar'
import { normalizeAssetDetails } from '../utils/assetNormalization'





interface UseAssetDetailsQueryOptions {
  assetId: number | null
  cookie: string | undefined
  enabled?: boolean
}

export function useAssetDetailsQuery({
  assetId,
  cookie,
  enabled = true
}: UseAssetDetailsQueryOptions) {
  return useQuery({
    queryKey: queryKeys.assets.details(assetId || 0),
    queryFn: async () => {
      if (!assetId || !cookie) throw new Error('Missing assetId or cookie')

      const data = await (window as any).api.getAssetDetails(cookie, assetId)


      const parsed = assetDetailsSchema.safeParse(data)
      if (!parsed.success) {
        console.warn('[useAssetDetailsQuery] Validation warning:', parsed.error.issues)

      }

      return normalizeAssetDetails(data)
    },
    enabled: enabled && !!assetId && !!cookie,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}





export function useAssetRecommendationsQuery({
  assetId,
  cookie,
  enabled = true
}: UseAssetDetailsQueryOptions) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())

  const query = useQuery({
    queryKey: queryKeys.assets.recommendations(assetId || 0),
    queryFn: async () => {
      if (!assetId || !cookie) throw new Error('Missing assetId or cookie')

      const data = await (window as any).api.getAssetRecommendations(cookie, assetId)


      const parsed = recommendationsSchema.safeParse(data)
      if (!parsed.success) {
        console.warn('[useAssetRecommendationsQuery] Validation warning:', parsed.error.issues)
      }

      return data
    },
    enabled: enabled && !!assetId && !!cookie,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })


  useEffect(() => {
    if (!query.data?.data || !Array.isArray(query.data.data) || !cookie) {
      setRecommendations([])
      return
    }

    const recIds = query.data.data.filter((id: any) => typeof id === 'number') as number[]

    if (recIds.length === 0) {
      setRecommendations([])
      return
    }


    const placeholders: RecommendationItem[] = recIds.map((id: number) => ({
      id,
      name: 'Loading...',
      price: null,
      itemType: 'Asset',
      assetType: 'Asset'
    }))
    setRecommendations(placeholders)


    ;(window as any).api
      .getBatchAssetDetails(cookie, recIds)
      .then((batchResults: any[]) => {
        const detailsMap = new Map(batchResults.map((d: any) => [d.id, d]))

        const updatedItems = placeholders.map((item) => {
          const d = detailsMap.get(item.id)
          if (d) {
            const isLimited =
              d.totalQuantity !== null && d.totalQuantity !== undefined && d.totalQuantity > 0
            const isLimitedUnique = d.totalQuantity === 1
            return {
              ...item,
              name: d.name || 'Unknown',
              creatorName: d.creatorName,
              price: d.price,
              isLimited,
              isLimitedUnique,
              lowestPrice: d.lowestPrice,
              lowestResalePrice: d.lowestResalePrice,
              collectibleItemId: d.collectibleItemId,
              totalQuantity: d.totalQuantity,
              favoriteCount: d.favoriteCount
            }
          }
          return item
        })
        setRecommendations(updatedItems)
      })
      .catch((err: any) => {
        console.error('Failed to fetch batch recommendation details:', err)
      })


    ;(window as any).api
      .getBatchThumbnails(recIds)
      .then((res: any) => {

        const parsed = thumbnailBatchSchema.safeParse(res)
        if (!parsed.success) {
          console.warn(
            '[useAssetRecommendationsQuery] Thumbnail validation warning:',
            parsed.error.issues
          )
        }

        if (res.data) {
          setThumbnails((prev) => {
            const newMap = new Map(prev)
            res.data.forEach((t: any) => {
              if (t.imageUrl) newMap.set(t.targetId, t.imageUrl)
            })
            return newMap
          })
        }
      })
      .catch((err: any) => {
        console.error('Failed to fetch recommendation thumbnails:', err)
      })
  }, [query.data, cookie])

  return {
    ...query,
    recommendations,
    recommendationThumbnails: thumbnails
  }
}





interface UseAssetDetailsResult {
  details: AssetDetails | null
  recommendations: RecommendationItem[]
  recommendationThumbnails: Map<number, string>
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useAssetDetailsWithRecommendations(
  assetId: number | null,
  cookie: string | undefined,
  isOpen: boolean
): UseAssetDetailsResult {
  const queryClient = useQueryClient()

  const detailsQuery = useAssetDetailsQuery({
    assetId,
    cookie,
    enabled: isOpen && !!assetId && !!cookie
  })

  const recommendationsQuery = useAssetRecommendationsQuery({
    assetId,
    cookie,
    enabled: isOpen && !!assetId && !!cookie
  })


  useEffect(() => {
    if (!isOpen && assetId) {


    }
  }, [isOpen, assetId, queryClient])

  const refetch = useCallback(() => {
    detailsQuery.refetch()
    recommendationsQuery.refetch()
  }, [detailsQuery, recommendationsQuery])

  return {
    details: detailsQuery.data || null,
    recommendations: recommendationsQuery.recommendations,
    recommendationThumbnails: recommendationsQuery.recommendationThumbnails,
    isLoading: detailsQuery.isLoading,
    error: detailsQuery.error?.message || null,
    refetch
  }
}