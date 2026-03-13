import { useEffect, useRef } from 'react'
import { useShowNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { useNotificationTrayStore } from '@renderer/stores/useNotificationTrayStore'
import { useFavoriteFriends } from '@renderer/stores/useFriendsStore'

/**
 * Hook to display popup notifications when FAVORITE friends join games.
 * Shows a checkmark and only notifies for favorite friends.
 */
export function useFriendJoinPopup() {
  const showNotification = useShowNotification()
  const notifications = useNotificationTrayStore((state) => state.notifications)
  const favorites = useFavoriteFriends()
  const lastNotificationIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Get the most recent notification
    if (notifications.length > 0) {
      const latestNotification = notifications[0]

      // Only process friend_ingame notifications that we haven't shown yet
      if (
        latestNotification.type === 'friend_ingame' &&
        latestNotification.id !== lastNotificationIdRef.current &&
        latestNotification.userId
      ) {
        // Check if this friend is a favorite
        const isFavorite = favorites.includes(latestNotification.userId)

        if (isFavorite) {
          lastNotificationIdRef.current = latestNotification.id

          // Show popup notification for favorite friends
          const message = `${latestNotification.title} ${latestNotification.gameInfo?.name ? `— ${latestNotification.gameInfo.name}` : ''}`
          showNotification(message, 'info', 4000)
        }
      }
    }
  }, [notifications, showNotification, favorites])
}
