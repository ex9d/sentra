import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

export const avatar3DManifestResponseSchema = z.object({
  imageUrl: z.string()
})

export type Avatar3DManifestResponse = z.infer<typeof avatar3DManifestResponseSchema>



export const ASSET_TYPES_WITH_3D_MODELS = new Set([
  8, 41, 42, 43, 44, 45, 46, 47, 19, 17, 27, 29, 28, 30, 31, 67, 70, 71, 72, 4, 40, 10, 79
])


export const FACE_ASSET_TYPE_ID = 18
export const BUNDLE_ITEM_TYPE = 'Bundle'


export const avatar3DKeys = {
  all: ['avatar3D'] as const,
  manifest: (userId: string | number) => [...avatar3DKeys.all, 'manifest', String(userId)] as const,
  assetManifest: (assetId: string | number) =>
    [...avatar3DKeys.all, 'assetManifest', String(assetId)] as const
}

export const useAvatar3DManifest = (userId: string | number | undefined, cookie?: string) => {
  return useQuery({
    queryKey: avatar3DKeys.manifest(userId ?? ''),
    queryFn: async () => {
      if (!userId) throw new Error('userId is required')
      if (!cookie) throw new Error('cookie is required for authenticated 3D manifest request')

      const result = await window.api.getAvatar3DManifest(cookie, userId)


      if (result.state === 'Pending' || result.state === 'InReview') {
        throw new Error(`Thumbnail ${result.state.toLowerCase()}, retrying...`)
      }

      if (!result.imageUrl) {
        throw new Error('Thumbnail not ready')
      }

      return result.imageUrl
    },
    enabled: !!userId && !!cookie,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 10,
    retryDelay: (attemptIndex) => Math.min(2000 * (attemptIndex + 1), 8000)
  })
}
export interface UseAsset3DManifestOptions {

  assetTypeId?: number | null
}

export const useAsset3DManifest = (
  assetId: string | number | undefined | null,
  cookie?: string,
  options?: UseAsset3DManifestOptions
) => {
  const assetTypeId = options?.assetTypeId


  const supports3D = assetTypeId == null || ASSET_TYPES_WITH_3D_MODELS.has(assetTypeId)

  return useQuery({
    queryKey: avatar3DKeys.assetManifest(assetId ?? ''),
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      if (!cookie) throw new Error('cookie is required for authenticated 3D manifest request')


      if (assetTypeId != null && !ASSET_TYPES_WITH_3D_MODELS.has(assetTypeId)) {
        throw new Error(
          assetTypeId === FACE_ASSET_TYPE_ID
            ? '3D view not available for Face assets'
            : '3D view not available for this asset type'
        )
      }

      const result = await window.api.getAsset3DManifest(cookie, assetId)
      return avatar3DManifestResponseSchema.parse(result).imageUrl
    },

    enabled: !!assetId && !!cookie && supports3D,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1
  })
}




export const useInvalidateAvatar3D = () => {
  const queryClient = useQueryClient()

  return {
    invalidateAvatar: (userId?: string | number) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: avatar3DKeys.manifest(userId) })
      } else {
        queryClient.invalidateQueries({ queryKey: avatar3DKeys.all })
      }
    },
    invalidateAsset: (assetId?: string | number) => {
      if (assetId) {
        queryClient.invalidateQueries({ queryKey: avatar3DKeys.assetManifest(assetId) })
      }
    }
  }
}