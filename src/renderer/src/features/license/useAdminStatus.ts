import { useQuery } from '@tanstack/react-query'

export interface AdminStatus {
  isAdmin: boolean
  message: string
  subscriptions?: any[]
}

export function useAdminStatus() {
  return useQuery<AdminStatus>(
    {
      queryKey: ['adminStatus'],
      queryFn: async () => {
        // Admin functionality has been removed
        return { isAdmin: false, message: '', subscriptions: [] }
      },
      staleTime: Infinity // Never refetch since this is static
    }
  )
}
