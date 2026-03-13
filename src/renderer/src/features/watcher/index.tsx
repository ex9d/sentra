import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Trash2, Square, Settings } from 'lucide-react'
import SessionsList from './components/SessionsList'
import WatcherEventLog from './components/WatcherEventLog'
import AccountSelectionModal from './components/AccountSelectionModal'
import { useWatcher } from './hooks/useWatcher'
import { useAccountsManager } from '@renderer/hooks/queries'
import { useLocalStorage } from '@renderer/hooks/useLocalStorage'
import { WatcherSession } from './hooks/useWatcher'

/**
 * WatcherTab - Multi-account launcher + watcher tab
 * Select multiple accounts, set place ID, launch for all, and watcher tracks them
 */
export default function WatcherTab() {
  const { accounts = [] } = useAccountsManager()
  const {
    sessions,
    events,
    removeSession,
    clearEvents,
    startWatching,
    stopWatching
  } = useWatcher()

  const isMac = window.platform?.isMac ?? false
  const [isWatcherRunning, setIsWatcherRunning] = useState(false)

  // Persist place ID in local storage
  const [placeId, setPlaceId] = useLocalStorage<string>('watcher-place-id', '')
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [isLaunching, setIsLaunching] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showRAMSettings, setShowRAMSettings] = useState(false)
  const [enableRAMLimiter, setEnableRAMLimiter] = useLocalStorage<boolean>('watcher-ram-limiter', false)
  const [ramLimit, setRamLimit] = useLocalStorage<number>('watcher-ram-limit', 800)
  const eventLogEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll event log to bottom
  useEffect(() => {
    eventLogEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  const handleToggleAccount = useCallback((accountId: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedAccountIds.size === accounts.length) {
      // If all are selected, deselect all
      setSelectedAccountIds(new Set())
    } else {
      // Otherwise, select all
      setSelectedAccountIds(new Set(accounts.map((a) => a.id)))
    }
  }, [accounts, selectedAccountIds.size])

  const handleRelaunchSession = useCallback(async (session: WatcherSession) => {
    if (!session.launchConfig) {
      alert('Cannot relaunch - no launch config available')
      return
    }

    setIsLaunching(true)
    try {
      await startWatching()
      setIsWatcherRunning(true)
      
      // Launch the game with the same config
      const result = (await window.electron.ipcRenderer.invoke('games:launch-game', {
        cookie: session.launchConfig.cookie,
        placeId: session.placeId,
        accountId: session.accountId,
        username: session.displayName || session.username || 'Unknown'
      })) as any

      if (result?.success) {
        // Auto-track the relaunched game with launch config
        await window.api.autoTrackLaunchedGame(
          session.accountId,
          session.username || 'Unknown',
          session.userId || 'unknown',
          session.placeId,
          session.launchConfig || {
            cookie: '', // This shouldn't happen as launchConfig should exist
            placeId: session.placeId
          },
          session.displayName || session.username,
          session.avatarUrl
        )
      } else {
        alert(`Failed to relaunch: ${result?.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`Error relaunching: ${error.message || 'Unknown error'}`)
    } finally {
      setIsLaunching(false)
    }
  }, [startWatching])

  const handleRemoveSession = useCallback(
    async (sessionId: string) => {
      if (confirm('Stop watching this session?')) {
        await removeSession(sessionId)
      }
    },
    [removeSession]
  )

  const handleCloseAllSessions = useCallback(async () => {
    if (confirm('Stop watching all sessions?')) {
      try {
        // Close all sessions with proper error handling
        const sessionsCopy = [...sessions]
        for (const session of sessionsCopy) {
          try {
            await removeSession(session.id)
          } catch (err) {
            console.error(`Failed to remove session ${session.id}:`, err)
          }
        }
      } catch (err) {
        console.error('Error closing all sessions:', err)
      }
    }
  }, [sessions, removeSession])

  const handleClearEvents = useCallback(async () => {
    if (confirm('Clear all events?')) {
      await clearEvents()
    }
  }, [clearEvents])

  const handleUpdateRAMConfig = useCallback(async () => {
    try {
      await window.electron.ipcRenderer.invoke('watcher:set-config', {
        enableRAMLimiter, // Use actual toggle state
        ramLimitMB: ramLimit,
        autoRestart: true,
        restartDelaySeconds: 5
      })
      setShowRAMSettings(false)
    } catch (error) {
      console.error('Failed to update watcher config:', error)
      alert('Failed to update RAM limiter config')
    }
  }, [enableRAMLimiter, ramLimit])

  const handleToggleWatcher = useCallback(async () => {
    if (isWatcherRunning) {
      stopWatching()
      setIsWatcherRunning(false)
    } else {
      // Set watcher config with auto-restart and RAM limiter based on toggle state
      try {
        await window.electron.ipcRenderer.invoke('watcher:set-config', {
          enableRAMLimiter, // Use actual toggle state
          ramLimitMB: ramLimit,
          autoRestart: true,
          restartDelaySeconds: 5
        })
      } catch (err) {
        console.error('Failed to set watcher config:', err)
      }

      // Start watcher first
      await startWatching()
      setIsWatcherRunning(true)

      // Launch all selected accounts slowly in the background
      if (selectedAccountIds.size > 0 && placeId) {
        // Don't block UI with setIsLaunching during background launches
        setTimeout(async () => {
          for (const accountId of selectedAccountIds) {
            const account = accounts.find((a) => a.id === accountId)
            if (!account || !account.cookie) continue

            try {
              // Launch game
              await window.api.launchGame(
                account.cookie,
                Number(placeId),
                undefined,
                undefined,
                undefined
              )

              // Wait 3 seconds for Roblox process to spawn
              await new Promise((r) => setTimeout(r, 3000))

              // Auto-track in watcher with launch config
              await window.api.autoTrackLaunchedGame(
                accountId,
                account.displayName || account.username,
                account.userId || 'unknown',
                Number(placeId),
                {
                  cookie: account.cookie,
                  placeId: Number(placeId)
                },
                account.displayName,
                account.avatarUrl
              )

              // 2 second delay before launching next account
              await new Promise((r) => setTimeout(r, 2000))
            } catch (err: any) {
              console.error(`Failed to launch ${account.displayName}:`, err)
            }
          }
        }, 0)
      }
    }
  }, [isWatcherRunning, startWatching, stopWatching, selectedAccountIds, placeId, accounts, enableRAMLimiter, ramLimit])

  const sessionCount = sessions.length
  const runningCount = sessions.filter((s) => s.status === 'running').length
  const crashedCount = sessions.filter((s) => s.status === 'crashed').length

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-app-bg)] text-[var(--color-text-primary)] font-sans">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] p-4">
        <h1 className="text-2xl font-bold mb-2">Watcher</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          Launch games and automatically monitor for crashes
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
          <div className="p-2 bg-[var(--color-surface)] rounded-lg">
            <div className="text-[var(--color-text-muted)]">Sessions</div>
            <div className="text-lg font-semibold">{sessionCount}</div>
          </div>
          <div className="p-2 bg-[var(--color-surface)] rounded-lg">
            <div className="text-[var(--color-text-muted)]">Running</div>
            <div className="text-lg font-semibold text-green-500">{runningCount}</div>
          </div>
          <div className="p-2 bg-[var(--color-surface)] rounded-lg">
            <div className="text-[var(--color-text-muted)]">Crashed</div>
            <div className="text-lg font-semibold text-red-500">{crashedCount}</div>
          </div>
        </div>

        {/* Launch Form */}
        <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-3">
          {/* Place ID Input */}
          <div>
            <label className="block text-sm font-medium mb-1">Place ID</label>
            <input
              type="number"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="e.g., 142823291"
              disabled={isLaunching}
              className="w-full px-3 py-2 bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] disabled:opacity-50 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Account Selection Button */}
          <div>
            <button
              onClick={() => setShowAccountModal(true)}
              disabled={isLaunching || accounts.length === 0}
              className="w-full px-4 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg hover:border-blue-500 disabled:opacity-50 text-left transition-colors"
            >
              <div className="text-sm font-medium">
                {selectedAccountIds.size === 0
                  ? 'Select Accounts'
                  : `${selectedAccountIds.size} Account${selectedAccountIds.size === 1 ? '' : 's'} Selected`}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {selectedAccountIds.size === 0 ? 'Click to choose accounts' : 'Click to modify'}
              </div>
            </button>
          </div>

          {/* Watcher Controls - All in one line */}
          <div className="flex items-center gap-1.5">
            {/* Launch/Stop Watcher Toggle Button */}
            <button
              onClick={handleToggleWatcher}
              className={`flex-1 px-2 py-1 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors text-xs ${
                isWatcherRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)]'
              }`}
              title={isWatcherRunning ? 'Stop watching' : 'Start watching'}
            >
              {isWatcherRunning ? (
                <>
                  <Square className="w-3 h-3" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Watch
                </>
              )}
            </button>

            {/* RAM Limiter Settings Button */}
            <button
              onClick={() => setShowRAMSettings(!showRAMSettings)}
              disabled={isMac}
              className="flex-1 px-2 py-1 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] disabled:bg-gray-600 disabled:opacity-50 text-[var(--accent-color-foreground)] rounded font-medium flex items-center justify-center gap-0.5 transition-colors text-xs"
              title={isMac ? 'RAM Limiter only available on Windows' : 'Configure RAM limiter'}
            >
              <Settings className="w-3 h-3" />
              RAM
            </button>
          </div>

          {/* RAM Limiter Settings Panel */}
          {showRAMSettings && !isMac && (
            <div className="p-3 bg-[var(--color-surface-muted)] border border-[var(--accent-color)]/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300">Enable RAM Limiter</label>
                <button
                  onClick={async () => {
                    const newState = !enableRAMLimiter
                    setEnableRAMLimiter(newState)
                    // Immediately update watcher config
                    try {
                      await window.electron.ipcRenderer.invoke('watcher:set-config', {
                        enableRAMLimiter: newState,
                        ramLimitMB: ramLimit,
                        autoRestart: true,
                        restartDelaySeconds: 5
                      })
                    } catch (error) {
                      console.error('Failed to update RAM config:', error)
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    enableRAMLimiter ? 'bg-[var(--accent-color)]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      enableRAMLimiter ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {enableRAMLimiter && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">Max RAM (MB)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="100"
                      max="4096"
                      step="50"
                      value={ramLimit}
                      onChange={(e) => setRamLimit(Number(e.target.value))}
                      className="flex-1 px-2 py-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 leading-tight">Auto-restarts processes over limit</p>
                </div>
              )}

              <button
                onClick={handleUpdateRAMConfig}
                className="w-full px-2 py-1 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded text-xs font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Sessions List */}
        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="text-lg font-semibold mb-2">Active Sessions</h2>
          <SessionsList
            sessions={sessions}
            onRemoveSession={handleRemoveSession}
            onRelaunchSession={handleRelaunchSession}
            onCloseAllSessions={handleCloseAllSessions}
          />
        </div>

        {/* Event Log */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-[var(--color-border)] pl-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Event Log</h2>
            {events.length > 0 && (
              <button
                onClick={handleClearEvents}
                className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-xs"
                title="Clear events"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <WatcherEventLog events={events} endRef={eventLogEndRef} />
        </div>
      </div>

      {/* Footer with status */}
      <div className="border-t border-[var(--color-border)] px-4 py-2 bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
        {sessionCount > 0 && (
          <span>
            • {runningCount} running{crashedCount > 0 && `, ${crashedCount} crashed`}
          </span>
        )}
        {sessionCount === 0 && (
          <span>No active sessions. Launch a game to start watching.</span>
        )}
      </div>

      {/* Account Selection Modal */}
      {showAccountModal && (
        <AccountSelectionModal
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          onToggleAccount={handleToggleAccount}
          onSelectAll={handleSelectAll}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  )
}
