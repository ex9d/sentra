import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useMemo } from 'react'
import { queryKeys } from '@shared/queryKeys'
import { thumbnailBatchSchema } from '@shared/ipc-schemas/avatar'





interface UseBatchThumbnailsOptions {
  assetIds: number[]
  enabled?: boolean
}





export function useBatchThumbnails({ assetIds, enabled = true }: UseBatchThumbnailsOptions) {

  const sortedIds = useMemo(() => [...assetIds].sort((a, b) => a - b), [assetIds])

  const query = useQuery({
    queryKey: queryKeys.batch.thumbnails(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const response = await (window as any).api.getBatchThumbnails(sortedIds)


      const parsed = thumbnailBatchSchema.safeParse(response)
      if (!parsed.success) {
        console.warn('[useBatchThumbnails] Validation warning:', parsed.error.issues)
      }


      const thumbnailMap: Record<number, string> = {}
      if (response.data) {
        response.data.forEach((t: any) => {
          if (t.imageUrl) {
            thumbnailMap[t.targetId] = t.imageUrl
          }
        })
      }

      return thumbnailMap
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })

  return {
    thumbnails: query.data || {},
    isLoading: query.isLoading,
    error: query.error
  }
}





interface UseBatchUserAvatarsOptions {
  userIds: number[]
  enabled?: boolean
}




export function useBatchUserAvatars({ userIds, enabled = true }: UseBatchUserAvatarsOptions) {

  const sortedIds = useMemo(() => [...userIds].sort((a, b) => a - b), [userIds])

  const query = useQuery({
    queryKey: queryKeys.batch.userAvatars(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const response = await (window as any).api.getBatchUserAvatars(sortedIds)


      return response as Record<number, string | null>
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })

  return {
    avatars: query.data || {},
    isLoading: query.isLoading,
    error: query.error
  }
}





interface UseBatchUserDetailsOptions {
  userIds: number[]
  enabled?: boolean
}

interface BatchUserDetail {
  id: number
  name: string
  displayName: string
}




export function useBatchUserDetails({ userIds, enabled = true }: UseBatchUserDetailsOptions) {

  const sortedIds = useMemo(() => [...userIds].sort((a, b) => a - b), [userIds])

  const query = useQuery({
    queryKey: queryKeys.batch.userDetails(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const response = await (window as any).api.getBatchUserDetails(sortedIds)


      return response as Record<number, BatchUserDetail | null>
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })

  return {
    users: query.data || {},
    isLoading: query.isLoading,
    error: query.error
  }
}





interface UseProgressiveThumbnailsOptions {
  ids: number[]
  batchSize?: number
  enabled?: boolean
}





export function useProgressiveThumbnails({
  ids,
  batchSize = 20,
  enabled = true
}: UseProgressiveThumbnailsOptions) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())
  const [loadedBatches, setLoadedBatches] = useState<Set<string>>(new Set())


  const uniqueIds = useMemo(() => {
    return [...new Set(ids)].filter((id) => !thumbnails.has(id))
  }, [ids, thumbnails])


  const batchKey = uniqueIds
    .slice(0, batchSize)
    .sort((a, b) => a - b)
    .join(',')

  useEffect(() => {
    if (!enabled || uniqueIds.length === 0 || loadedBatches.has(batchKey)) {
      return
    }

    const idsToFetch = uniqueIds.slice(0, batchSize)

    setLoadedBatches((prev) => new Set(prev).add(batchKey))
    ;(window as any).api
      .getBatchThumbnails(idsToFetch)
      .then((res: any) => {
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
        console.error('Failed to fetch batch thumbnails:', err)

        setLoadedBatches((prev) => {
          const newSet = new Set(prev)
          newSet.delete(batchKey)
          return newSet
        })
      })
  }, [enabled, uniqueIds, batchSize, batchKey, loadedBatches])

  return {
    thumbnails,
    pendingCount: uniqueIds.length
  }
}