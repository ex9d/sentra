import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import { Game } from '@renderer/types'

interface GameSort {
  token: string
  name: string
  displayName: string
}


export function useGameSorts(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.sorts(sessionId),
    queryFn: () => window.api.getGameSorts(sessionId) as Promise<GameSort[]>,
    staleTime: 5 * 60 * 1000
  })
}


export function useGamesInSort(sortId: string | null, sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.inSort(sortId || '', sessionId),
    queryFn: () => window.api.getGamesInSort(sortId!, sessionId) as Promise<Game[]>,
    enabled: !!sortId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}


export function useSearchGames(query: string, sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.search(query, sessionId),
    queryFn: () => window.api.searchGames(query, sessionId) as Promise<Game[]>,
    enabled: query.trim().length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}


export function useRecentlyPlayedGames(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.recentlyPlayed(),
    queryFn: () => window.api.getRecentlyPlayedGames(sessionId) as Promise<Game[]>,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })
}


export function useGamesByPlaceIds(placeIds: string[]) {
  return useQuery({
    queryKey: queryKeys.games.byPlaceIds(placeIds),
    queryFn: () => window.api.getGamesByPlaceIds(placeIds) as Promise<Game[]>,
    enabled: placeIds.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}


export function useFavoriteGames() {
  return useQuery({
    queryKey: queryKeys.games.favorites(),
    queryFn: () => window.api.getFavoriteGames(),
    staleTime: 60 * 1000
  })
}


export function useAddFavoriteGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (placeId: string) => window.api.addFavoriteGame(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.favorites() })
    }
  })
}


export function useRemoveFavoriteGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (placeId: string) => window.api.removeFavoriteGame(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.favorites() })
    }
  })
}