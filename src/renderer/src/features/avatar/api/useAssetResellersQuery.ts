import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import { queryKeys } from '@shared/queryKeys'
import {
  ResellerItem,
  AssetDetails,
  resellersResponseSchema,
  purchaseLimitedResultSchema
} from '@shared/ipc-schemas/avatar'
import { useBatchUserAvatars } from './useBatchQueries'





interface UseAssetResellersQueryOptions {
  collectibleItemId: string | null | undefined
  isLimited: boolean
  enabled?: boolean
}

export function useAssetResellersQuery({
  collectibleItemId,
  isLimited,
  enabled = true
}: UseAssetResellersQueryOptions) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: queryKeys.assets.resellers(collectibleItemId || ''),
    queryFn: async ({ pageParam }) => {
      if (!collectibleItemId) throw new Error('Missing collectibleItemId')

      const response = await (window as any).api.getAssetResellers(
        collectibleItemId,
        100,
        pageParam || undefined
      )


      const parsed = resellersResponseSchema.safeParse(response)
      if (!parsed.success) {
        console.warn('[useAssetResellersQuery] Validation warning:', parsed.error.issues)
      }

      return {
        data: (response.data || []) as ResellerItem[],
        nextPageCursor: response.nextPageCursor || null
      }
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor || undefined,
    enabled: enabled && isLimited && !!collectibleItemId,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000
  })


  const resellers = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) || []
  }, [query.data])


  const sellerIds = useMemo(() => {
    return [...new Set(resellers.map((r) => r.seller.sellerId))]
  }, [resellers])


  const { avatars: avatarData } = useBatchUserAvatars({
    userIds: sellerIds,
    enabled: sellerIds.length > 0
  })


  const resellerAvatars = useMemo(() => {
    const map = new Map<number, string>()
    Object.entries(avatarData).forEach(([id, url]) => {
      if (url) map.set(Number(id), url)
    })
    return map
  }, [avatarData])

  const refetchResellers = useCallback(() => {
    if (collectibleItemId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.resellers(collectibleItemId)
      })
    }
  }, [collectibleItemId, queryClient])

  return {
    resellers,
    resellersLoading: query.isLoading,
    resellerAvatars,
    resellersCursor: query.hasNextPage ? 'has-more' : null,
    loadingMoreResellers: query.isFetchingNextPage,
    loadMoreResellers: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    refetchResellers
  }
}





interface PurchaseResellerParams {
  cookie: string
  collectibleItemInstanceId: string
  price: number
  sellerId: number
  collectibleProductId: string
}

export function usePurchaseLimitedItem(collectibleItemId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cookie,
      collectibleItemInstanceId,
      price,
      sellerId,
      collectibleProductId
    }: PurchaseResellerParams) => {
      const result = await (window as any).api.purchaseLimitedItem(
        cookie,
        collectibleItemInstanceId,
        price,
        sellerId,
        collectibleProductId
      )


      const parsed = purchaseLimitedResultSchema.safeParse(result)
      if (!parsed.success) {
        console.warn('[usePurchaseLimitedItem] Validation warning:', parsed.error.issues)
      }

      return result
    },
    onSuccess: (result) => {
      if (result.purchased && collectibleItemId) {

        queryClient.invalidateQueries({
          queryKey: queryKeys.assets.resellers(collectibleItemId)
        })
      }
    }
  })
}





interface UseAssetResellersResult {
  resellers: ResellerItem[]
  resellersLoading: boolean
  resellerAvatars: Map<number, string>
  purchasingReseller: string | null
  resellersCursor: string | null
  loadingMoreResellers: boolean
  handleBuyReseller: (reseller: ResellerItem) => Promise<void>
  loadMoreResellers: () => Promise<void>
  setPurchasingReseller: (id: string | null) => void
}

export function useAssetResellersWithPurchase(
  details: AssetDetails | null,
  account: { cookie: string } | null
): UseAssetResellersResult {
  const [purchasingReseller, setPurchasingReseller] = useState<string | null>(null)

  const isLimited = !!(details?.isLimited || details?.isLimitedUnique)
  const collectibleItemId = details?.collectibleItemId

  const resellersQuery = useAssetResellersQuery({
    collectibleItemId,
    isLimited,
    enabled: !!collectibleItemId
  })

  const purchaseMutation = usePurchaseLimitedItem(collectibleItemId)

  const handleBuyReseller = useCallback(
    async (reseller: ResellerItem) => {
      if (!account?.cookie || !details?.collectibleItemId) return

      if (
        !confirm(
          `Are you sure you want to buy this item for ${reseller.price.toLocaleString()} Robux?`
        )
      ) {
        return
      }

      setPurchasingReseller(reseller.collectibleProductId)

      try {
        const result = await purchaseMutation.mutateAsync({
          cookie: account.cookie,
          collectibleItemInstanceId: reseller.collectibleItemInstanceId,
          price: reseller.price,
          sellerId: reseller.seller.sellerId,
          collectibleProductId: reseller.collectibleProductId
        })

        if (!result.purchased) {
          console.error('Purchase failed:', result)
          alert(
            `Purchase failed: ${result.reason || result.errorMessage || result.shortMessage || 'Unknown error'}`
          )
        }
      } catch (err: any) {
        console.error('Purchase error:', err)
        alert(`Purchase error: ${err.message}`)
      } finally {
        setPurchasingReseller(null)
      }
    },
    [account?.cookie, details?.collectibleItemId, purchaseMutation]
  )

  return {
    resellers: resellersQuery.resellers,
    resellersLoading: resellersQuery.resellersLoading,
    resellerAvatars: resellersQuery.resellerAvatars,
    purchasingReseller,
    resellersCursor: resellersQuery.resellersCursor,
    loadingMoreResellers: resellersQuery.loadingMoreResellers,
    handleBuyReseller,
    loadMoreResellers: async () => {
      await resellersQuery.loadMoreResellers()
    },
    setPurchasingReseller
  }
}