import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import type { LogMetadata } from '@shared/ipc-schemas/system'

export function useLogs(options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: queryKeys.logs.list(),
    queryFn: () => window.api.getLogs() as Promise<LogMetadata[]>,
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 5000
  })
}

export function useLogContent(filename: string | null) {
  return useQuery({
    queryKey: queryKeys.logs.content(filename ?? 'unknown'),
    queryFn: () => window.api.getLogContent(filename!) as Promise<string>,
    enabled: Boolean(filename)
  })
}

export function useDeleteLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filename: string) => window.api.deleteLog(filename),
    onSuccess: (_, filename) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.list() })
      queryClient.removeQueries({ queryKey: queryKeys.logs.content(filename) })
    }
  })
}

export function useDeleteAllLogs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => window.api.deleteAllLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.list() })
      queryClient.removeQueries({ queryKey: queryKeys.logs.all })
    }
  })
}
