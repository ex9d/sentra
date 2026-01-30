import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LogsState {
  searchQuery: string
  selectedLogId: string | null
  autoRefreshEnabled: boolean
}

interface LogsActions {
  setSearchQuery: (value: string) => void
  setSelectedLogId: (logId: string | null) => void
  toggleAutoRefresh: () => void
}

type LogsStore = LogsState & LogsActions

const initialState: LogsState = {
  searchQuery: '',
  selectedLogId: null,
  autoRefreshEnabled: true
}

export const useLogsStore = create<LogsStore>()(
  persist(
    (set) => ({
      ...initialState,
      setSearchQuery: (value) => set({ searchQuery: value }),
      setSelectedLogId: (logId) => set({ selectedLogId: logId }),
      toggleAutoRefresh: () => set((state) => ({ autoRefreshEnabled: !state.autoRefreshEnabled }))
    }),
    {
      name: 'logs-store',
      partialize: ({ searchQuery, autoRefreshEnabled }) => ({
        searchQuery,
        autoRefreshEnabled
      })
    }
  )
)

export const useLogSearchQuery = () => useLogsStore((state) => state.searchQuery)
export const useSetLogSearchQuery = () => useLogsStore((state) => state.setSearchQuery)
export const useSelectedLogId = () => useLogsStore((state) => state.selectedLogId)
export const useSetSelectedLogId = () => useLogsStore((state) => state.setSelectedLogId)
export const useAutoRefreshEnabled = () => useLogsStore((state) => state.autoRefreshEnabled)
export const useToggleAutoRefresh = () => useLogsStore((state) => state.toggleAutoRefresh)
