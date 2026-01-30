import { useQuery } from '@tanstack/react-query'
import { findSparklesInHierarchy, SparklesInstance } from './fireUtils'

/**
 * Hook to fetch asset hierarchy and extract sparkles instances
 */
export const useAssetSparkles = (assetId: number | null | undefined, enabled: boolean = true) => {
  return useQuery<SparklesInstance[], Error>({
    queryKey: ['assetSparkles', assetId],
    queryFn: async () => {
      if (!assetId) return []

      try {
        const hierarchy = await window.api.getAssetHierarchy(assetId)
        return findSparklesInHierarchy(hierarchy)
      } catch (err) {
        console.error('Failed to fetch asset hierarchy for sparkles:', err)
        return []
      }
    },
    enabled: enabled && !!assetId,
    staleTime: Infinity, // Hierarchy doesn't change
    gcTime: 10 * 60 * 1000 // Cache for 10 minutes
  })
}

export default useAssetSparkles
