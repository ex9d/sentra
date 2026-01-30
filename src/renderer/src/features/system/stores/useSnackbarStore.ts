import { create } from 'zustand'
import { devtools } from 'zustand/middleware'





export type SnackbarType = 'success' | 'error' | 'info' | 'warning'

export interface SnackbarNotification {
  id: string
  message: string
  type: SnackbarType
  duration: number
}

interface SnackbarState {
  notifications: SnackbarNotification[]
}

interface SnackbarActions {
  showNotification: (message: string, type?: SnackbarType, duration?: number) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

type SnackbarStore = SnackbarState & SnackbarActions





export const useSnackbarStore = create<SnackbarStore>()(
  devtools(
    (set) => ({
      notifications: [],

      showNotification: (message, type = 'info', duration = 5000) => {
        const id = Math.random().toString(36).substring(7)
        const notification: SnackbarNotification = { id, message, type, duration }

        set(
          (state) => ({
            notifications: [...state.notifications, notification]
          }),
          false,
          'showNotification'
        )
      },

      removeNotification: (id) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id)
          }),
          false,
          'removeNotification'
        ),

      clearAll: () => set({ notifications: [] }, false, 'clearAll')
    }),
    { name: 'SnackbarStore' }
  )
)





export const useSnackbarNotifications = () => useSnackbarStore((state) => state.notifications)


export const useShowNotification = () => useSnackbarStore((state) => state.showNotification)
export const useRemoveSnackbar = () => useSnackbarStore((state) => state.removeNotification)
export const useClearAllSnackbars = () => useSnackbarStore((state) => state.clearAll)









export const useNotification = () => {
  const showNotification = useSnackbarStore((state) => state.showNotification)
  return { showNotification }
}