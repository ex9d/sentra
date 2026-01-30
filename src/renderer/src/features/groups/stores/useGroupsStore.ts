import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type GroupsTabType = 'joined' | 'pending'

interface GroupsState {

  activeGroupsTab: GroupsTabType


  selectedGroupId: number | null


  searchQuery: string


  scrollPosition: number
}

interface GroupsActions {
  setActiveGroupsTab: (tab: GroupsTabType) => void
  setSelectedGroupId: (groupId: number | null) => void
  setSearchQuery: (query: string) => void
  setScrollPosition: (position: number) => void
  reset: () => void
}

type GroupsStore = GroupsState & GroupsActions

const initialState: GroupsState = {
  activeGroupsTab: 'joined',
  selectedGroupId: null,
  searchQuery: '',
  scrollPosition: 0
}

export const useGroupsStore = create<GroupsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setActiveGroupsTab: (activeGroupsTab) =>
          set(
            { activeGroupsTab, selectedGroupId: null, searchQuery: '' },
            false,
            'setActiveGroupsTab'
          ),

        setSelectedGroupId: (selectedGroupId) =>
          set({ selectedGroupId }, false, 'setSelectedGroupId'),

        setSearchQuery: (searchQuery) => set({ searchQuery }, false, 'setSearchQuery'),

        setScrollPosition: (scrollPosition) => set({ scrollPosition }, false, 'setScrollPosition'),

        reset: () => set(initialState, false, 'reset')
      }),
      {
        name: 'groups-storage',
        partialize: (state) => ({
          activeGroupsTab: state.activeGroupsTab
        })
      }
    ),
    { name: 'GroupsStore' }
  )
)


export const useActiveGroupsTab = () => useGroupsStore((state) => state.activeGroupsTab)
export const useSetActiveGroupsTab = () => useGroupsStore((state) => state.setActiveGroupsTab)
export const useSelectedGroupId = () => useGroupsStore((state) => state.selectedGroupId)
export const useSetSelectedGroupId = () => useGroupsStore((state) => state.setSelectedGroupId)
export const useGroupsSearchQuery = () => useGroupsStore((state) => state.searchQuery)
export const useSetGroupsSearchQuery = () => useGroupsStore((state) => state.setSearchQuery)