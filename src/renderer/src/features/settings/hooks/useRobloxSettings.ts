import { useState, useEffect, useCallback } from 'react'

export interface RobloxSettings {
  defaultPhysicsEngine: 'Terrain' | 'Legacy'
  enableOptimizations: boolean
  memoryLimit: number
  useDirectX12: boolean
  lowEndGraphics: boolean
  disableDualChannelAudio: boolean
}

/**
 * useRobloxSettings - Custom hook for managing Roblox settings state and API interactions
 */
export function useRobloxSettings() {
  const [settings, setSettings] = useState<RobloxSettings>({
    defaultPhysicsEngine: 'Terrain',
    enableOptimizations: true,
    memoryLimit: 0,
    useDirectX12: true,
    lowEndGraphics: false,
    disableDualChannelAudio: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Note: getRobloxSettings API not exposed to renderer yet
      // const loaded = await window.api.getRobloxSettings()
      // setSettings(loaded)
    } catch (err) {
      console.error('[useRobloxSettings] Failed to load settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (newSettings: Partial<RobloxSettings>) => {
    setIsLoading(true)
    setError(null)
    try {
      // Note: setRobloxSettings API not exposed to renderer yet
      // await window.api.setRobloxSettings(newSettings)
      setSettings((prev) => ({ ...prev, ...newSettings }))
    } catch (err) {
      console.error('[useRobloxSettings] Failed to update settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings: loadSettings
  }
}
