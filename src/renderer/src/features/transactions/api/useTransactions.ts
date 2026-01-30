import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@shared/queryKeys'
import type { TransactionTypeEnum, TransactionTimeFrame } from '@shared/ipc-schemas/transactions'

export const useTransactionTypes = (cookie?: string) => {
  return useQuery({
    queryKey: queryKeys.transactions.types(cookie || ''),
    queryFn: () => window.api.getTransactionTypes(cookie!),
    enabled: !!cookie,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export const useTransactions = (
  cookie: string | undefined,
  transactionType: TransactionTypeEnum,
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions.list(cookie || '', transactionType),
    queryFn: async ({ pageParam }) => {
      return window.api.getTransactions(cookie!, transactionType, pageParam, 100)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.previousPageCursor ?? undefined,
    enabled: !!cookie && enabled,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

export const useTransactionTotals = (
  cookie?: string,
  timeFrame: TransactionTimeFrame = 'Month'
) => {
  return useQuery({
    queryKey: queryKeys.transactions.totals(cookie || '', timeFrame),
    queryFn: () => window.api.getTransactionTotals(cookie!, timeFrame),
    enabled: !!cookie,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}
