import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@shared/queryKeys'
import { ResaleData, resaleDataSchema } from '@shared/ipc-schemas/avatar'

// ============================================================================
// Resale Data Query Hook
// ============================================================================

interface UseResaleDataQueryOptions {
  assetId: number | null
  enabled?: boolean
}

/**
 * Fetches resale data for a limited item using TanStack Query.
 * Only fetches when enabled (typically when economy tab is active).
 */
export function useResaleDataQuery({ assetId, enabled = true }: UseResaleDataQueryOptions) {
  return useQuery({
    queryKey: queryKeys.assets.resaleData(assetId || 0),
    queryFn: async () => {
      if (!assetId) throw new Error('Missing assetId')

      const data = await (window as any).api.getResaleData(assetId)

      // Validate with Zod schema
      const parsed = resaleDataSchema.safeParse(data)
      if (!parsed.success) {
        console.warn('[useResaleDataQuery] Validation warning:', parsed.error.issues)
      }

      return data as ResaleData
    },
    enabled: enabled && !!assetId,
    staleTime: 60 * 1000, // 1 minute - resale data changes infrequently
    gcTime: 10 * 60 * 1000 // 10 minutes garbage collection
  })
}
