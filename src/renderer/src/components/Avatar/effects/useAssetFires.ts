import { useQuery } from '@tanstack/react-query'
import { findFiresInHierarchy, FireInstance } from '../effects/fireUtils'




export const useAssetFires = (assetId: number | null | undefined, enabled: boolean = true) => {
  return useQuery<FireInstance[], Error>({
    queryKey: ['assetFires', assetId],
    queryFn: async () => {
      if (!assetId) return []

      try {
        const hierarchy = await window.api.getAssetHierarchy(assetId)
        return findFiresInHierarchy(hierarchy)
      } catch (err) {
        console.error('Failed to fetch asset hierarchy for fires:', err)
        return []
      }
    },
    enabled: enabled && !!assetId,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000
  })
}

export default useAssetFires