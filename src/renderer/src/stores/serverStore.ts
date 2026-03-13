import { create } from 'zustand'

interface ServerState {
  regions: Record<string, string>
  setRegion: (jobId: string, region: string) => void
  setRegions: (regions: Record<string, string>) => void
  getRegion: (jobId: string) => string | undefined
}

export const useServerStore = create<ServerState>((set, get) => ({
  regions: {},
  setRegion: (jobId, region) =>
    set((state) => ({
      regions: { ...state.regions, [jobId]: region }
    })),
  setRegions: (newRegions) =>
    set((state) => ({
      regions: { ...state.regions, ...newRegions }
    })),
  getRegion: (jobId) => get().regions[jobId]
}))
