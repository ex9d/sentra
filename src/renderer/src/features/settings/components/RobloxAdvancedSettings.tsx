import { useState, useCallback } from 'react'
import { X, Save } from 'lucide-react'

export interface RobloxSettings {
  defaultPhysicsEngine: 'Terrain' | 'Legacy'
  enableOptimizations: boolean
  memoryLimit: number
  useDirectX12: boolean
  lowEndGraphics: boolean
  disableDualChannelAudio: boolean
}

interface RobloxAdvancedSettingsProps {
  settings: RobloxSettings
  onSettingsChange: (settings: Partial<RobloxSettings>) => Promise<void>
  onClose: () => void
  isLoading?: boolean
}

/**
 * RobloxAdvancedSettings - Configuration UI for advanced Roblox settings
 */
export default function RobloxAdvancedSettings({
  settings,
  onSettingsChange,
  onClose,
  isLoading = false
}: RobloxAdvancedSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = useCallback((key: keyof RobloxSettings, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // Only send changed values
      const changes: Partial<RobloxSettings> = {}
      Object.keys(localSettings).forEach((keyStr) => {
        const key = keyStr as keyof RobloxSettings
        if (localSettings[key] !== settings[key]) {
          ;(changes as any)[key] = localSettings[key]
        }
      })

      if (Object.keys(changes).length > 0) {
        await onSettingsChange(changes as Partial<RobloxSettings>)
      }
      onClose()
    } catch (error) {
      console.error('[RobloxAdvancedSettings] Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }, [localSettings, settings, onSettingsChange, onClose])

  const handleCancel = useCallback(() => {
    setLocalSettings(settings)
    onClose()
  }, [settings, onClose])

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Roblox Advanced Settings</h2>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
          disabled={isSaving || isLoading}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enable Optimizations */}
        <div className="flex items-start gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <input
            type="checkbox"
            id="enableOptimizations"
            checked={localSettings.enableOptimizations}
            onChange={(e) => handleChange('enableOptimizations', e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--accent-color)] cursor-pointer mt-0.5"
            disabled={isSaving || isLoading}
          />
          <label htmlFor="enableOptimizations" className="cursor-pointer flex-1">
            <div className="font-medium">Performance Optimizations</div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Enable performance enhancements and optimizations
            </div>
          </label>
        </div>

        {/* Use DirectX 12 */}
        <div className="flex items-start gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <input
            type="checkbox"
            id="useDirectX12"
            checked={localSettings.useDirectX12}
            onChange={(e) => handleChange('useDirectX12', e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--accent-color)] cursor-pointer mt-0.5"
            disabled={isSaving || isLoading}
          />
          <label htmlFor="useDirectX12" className="cursor-pointer flex-1">
            <div className="font-medium">Use DirectX 12 (Windows)</div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Better graphics rendering with DirectX 12 support
            </div>
          </label>
        </div>

        {/* Low End Graphics */}
        <div className="flex items-start gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <input
            type="checkbox"
            id="lowEndGraphics"
            checked={localSettings.lowEndGraphics}
            onChange={(e) => handleChange('lowEndGraphics', e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--accent-color)] cursor-pointer mt-0.5"
            disabled={isSaving || isLoading}
          />
          <label htmlFor="lowEndGraphics" className="cursor-pointer flex-1">
            <div className="font-medium">Low-End Graphics Mode</div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Optimize for low-end hardware with reduced graphics
            </div>
          </label>
        </div>

        {/* Disable Dual Channel Audio */}
        <div className="flex items-start gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <input
            type="checkbox"
            id="disableDualChannelAudio"
            checked={localSettings.disableDualChannelAudio}
            onChange={(e) => handleChange('disableDualChannelAudio', e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--accent-color)] cursor-pointer mt-0.5"
            disabled={isSaving || isLoading}
          />
          <label htmlFor="disableDualChannelAudio" className="cursor-pointer flex-1">
            <div className="font-medium">Disable Dual Channel Audio</div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Disable stereo audio for compatibility
            </div>
          </label>
        </div>

        {/* Memory Limit */}
        <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <label htmlFor="memoryLimit" className="block font-medium mb-2">
            Memory Limit (MB)
          </label>
          <input
            type="number"
            id="memoryLimit"
            min="0"
            max="16384"
            step="256"
            value={localSettings.memoryLimit}
            onChange={(e) => handleChange('memoryLimit', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            disabled={isSaving || isLoading}
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Set maximum memory allocation (0 = unlimited). Requires restart.
          </p>
        </div>

        {/* Default Physics Engine */}
        <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <label htmlFor="defaultPhysicsEngine" className="block font-medium mb-2">
            Default Physics Engine
          </label>
          <select
            id="defaultPhysicsEngine"
            value={localSettings.defaultPhysicsEngine}
            onChange={(e) => handleChange('defaultPhysicsEngine', e.target.value as 'Terrain' | 'Legacy')}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            disabled={isSaving || isLoading}
          >
            <option value="Terrain">Terrain (Default)</option>
            <option value="Legacy">Legacy</option>
          </select>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Select the physics engine for gameplay simulation
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving || isLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          disabled={isSaving || isLoading}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
