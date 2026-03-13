import { useState, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import { WatcherConfig } from '../hooks/useWatcher'

interface WatcherSettingsProps {
  config: WatcherConfig
  onConfigChange: (config: Partial<WatcherConfig>) => Promise<void>
  onClose: () => void
}

/**
 * WatcherSettings - Configuration settings for the watcher
 */
export default function WatcherSettings({
  config,
  onConfigChange,
  onClose
}: WatcherSettingsProps) {
  const [localConfig, setLocalConfig] = useState(config)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = useCallback((key: keyof WatcherConfig, value: any) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onConfigChange(localConfig)
      onClose()
    } catch (error) {
      console.error('[WatcherSettings] Error saving config:', error)
    } finally {
      setIsSaving(false)
    }
  }, [localConfig, onConfigChange, onClose])

  const handleCancel = useCallback(() => {
    setLocalConfig(config)
    onClose()
  }, [config, onClose])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Watcher Settings</h3>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto-Restart Option */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoRestart"
            checked={localConfig.autoRestart}
            onChange={(e) => handleChange('autoRestart', e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--accent-color)] cursor-pointer"
          />
          <label htmlFor="autoRestart" className="cursor-pointer flex-1">
            <div className="font-medium">Auto-Restart Crashed Clients</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Automatically restart clients when a crash is detected
            </div>
          </label>
        </div>

        {/* Restart Delay */}
        <div>
          <label className="block font-medium mb-2">
            Restart Delay (seconds)
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={localConfig.restartDelaySeconds}
            onChange={(e) => handleChange('restartDelaySeconds', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Wait this many seconds before restarting a crashed client
          </p>
        </div>

        {/* Check Interval */}
        <div>
          <label className="block font-medium mb-2">
            Check Interval (milliseconds)
          </label>
          <input
            type="number"
            min="1000"
            max="60000"
            step="1000"
            value={localConfig.checkIntervalMs}
            onChange={(e) => handleChange('checkIntervalMs', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            How often to check process status and log files
          </p>
        </div>

        {/* Log Check Interval */}
        <div>
          <label className="block font-medium mb-2">
            Log Check Interval (milliseconds)
          </label>
          <input
            type="number"
            min="500"
            max="10000"
            step="500"
            value={localConfig.logCheckIntervalMs}
            onChange={(e) => handleChange('logCheckIntervalMs', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            How often to check log files for crash indicators
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-3 bg-[var(--color-surface-strong)] rounded-lg border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          <strong>Crash Detection:</strong> The watcher monitors Roblox log files for indicators like
          <code className="bg-[var(--color-surface)] px-1 mx-0.5 rounded">destroyLuaApp</code>,
          <code className="bg-[var(--color-surface)] px-1 mx-0.5 rounded">HttpError</code>{' '}
          and process status changes.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t border-[var(--color-border)]">
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-color)] text-[var(--accent-color-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
