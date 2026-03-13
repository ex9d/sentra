import { useState, useCallback, useRef, useEffect } from 'react'
import { Friend } from '@renderer/types'

export interface PlayerSearchResult {
  type: 'player'
  id: number
  name: string
  displayName: string
  hasVerifiedBadge?: boolean
  isFriend?: boolean
  avatarUrl?: string
}

interface UsePlayerSearchOptions {
  debounceMs?: number
  friends?: Friend[]
}

export function usePlayerSearch(options: UsePlayerSearchOptions = {}) {
  const { debounceMs = 300, friends = [] } = options

  const [result, setResult] = useState<PlayerSearchResult | null>(null)
  const [matchingFriends, setMatchingFriends] = useState<PlayerSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef<string>('')

  const searchPlayer = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim().toLowerCase()

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (!trimmedQuery || trimmedQuery.length < 2) {
        setResult(null)
        setMatchingFriends([])
        setIsLoading(false)
        setError(null)
        return
      }

      lastQueryRef.current = trimmedQuery

      const friendMatches = friends
        .filter(
          (f) =>
            f.username.toLowerCase().includes(trimmedQuery) ||
            f.displayName.toLowerCase().includes(trimmedQuery)
        )
        .slice(0, 5)
        .map((f) => ({
          type: 'player' as const,
          id: parseInt(f.userId),
          name: f.username,
          displayName: f.displayName,
          isFriend: true,
          avatarUrl: f.avatarUrl
        }))

      setMatchingFriends(friendMatches)

      debounceRef.current = setTimeout(async () => {
        if (lastQueryRef.current !== trimmedQuery) return

        setIsLoading(true)
        setError(null)

        try {
          const userData = await window.api.getUserByUsername(query.trim())

          if (lastQueryRef.current !== trimmedQuery) return

          if (!userData) {
            setResult(null)
            return
          }

          const isFriend = friends.some((f) => f.userId === userData.id.toString())

          let avatarUrl: string | undefined
          try {
            const avatars = await window.api.getBatchUserAvatars([userData.id], '150x150')
            avatarUrl = avatars[userData.id] || undefined
          } catch {
            // ignore avatar fetch errors
          }

          setResult({
            type: 'player',
            id: userData.id,
            name: userData.name,
            displayName: userData.displayName,
            isFriend,
            avatarUrl
          })
        } catch {
          if (lastQueryRef.current !== trimmedQuery) return
          setResult(null)
        } finally {
          if (lastQueryRef.current === trimmedQuery) {
            setIsLoading(false)
          }
        }
      }, debounceMs)
    },
    [debounceMs, friends]
  )

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    setResult(null)
    setMatchingFriends([])
    setIsLoading(false)
    setError(null)
    lastQueryRef.current = ''
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    searchPlayer,
    reset,
    result,
    matchingFriends,
    isLoading,
    error
  }
}
