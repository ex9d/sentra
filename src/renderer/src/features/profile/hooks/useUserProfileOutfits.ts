import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@shared/queryKeys'

// Fetch user outfits for profile view
export function useUserProfileOutfits(userId: number, cookie: string, enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.userProfile.outfits(userId, cookie, false),
    queryFn: async () => {
      const [editableResponse, purchasedResponse] = await Promise.all([
        window.api.getUserOutfits(cookie, userId, true, 1),
        window.api.getUserOutfits(cookie, userId, false, 1)
      ])

      const allOutfits = [
        ...(editableResponse.data || []).map((o: any) => ({ ...o, type: 'Creation' })),
        ...(purchasedResponse.data || []).map((o: any) => ({ ...o, type: 'Purchased' }))
      ]

      if (allOutfits.length > 0) {
        const outfitIds = allOutfits.map((o: any) => o.id)
        const thumbnails = await window.api.getBatchThumbnails(outfitIds, 'Outfit')
        const thumbMap = new Map(thumbnails.data.map((t: any) => [t.targetId, t.imageUrl]))

        return allOutfits.map((outfit: any) => ({
          id: outfit.id,
          name: outfit.name,
          type: outfit.type,
          imageUrl: thumbMap.get(outfit.id) || ''
        }))
      }
      return []
    },
    enabled: enabled && !!cookie && !!userId,
    staleTime: 30 * 1000 // 30 seconds
  })
}
