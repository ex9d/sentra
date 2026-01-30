import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@shared/queryKeys'
import { ResaleData, resaleDataSchema } from '@shared/ipc-schemas/avatar'





interface UseResaleDataQueryOptions {
  assetId: number | null
  enabled?: boolean
}





export function useResaleDataQuery({ assetId, enabled = true }: UseResaleDataQueryOptions) {
  return useQuery({
    queryKey: queryKeys.assets.resaleData(assetId || 0),
    queryFn: async () => {
      if (!assetId) throw new Error('Missing assetId')

      const data = await (window as any).api.getResaleData(assetId)


      const parsed = resaleDataSchema.safeParse(data)
      if (!parsed.success) {
        console.warn('[useResaleDataQuery] Validation warning:', parsed.error.issues)
      }

      return data as ResaleData
    },
    enabled: enabled && !!assetId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}