import { useQuery } from '@tanstack/react-query'
import { findFiresInHierarchy, FireInstance } from '../effects/fireUtils'

/**
 * Hook to fetch asset hierarchy and extract fire instances
 */
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
    staleTime: Infinity, // Hierarchy doesn't change
    gcTime: 10 * 60 * 1000 // Cache for 10 minutes
  })
}

export default useAssetFires
