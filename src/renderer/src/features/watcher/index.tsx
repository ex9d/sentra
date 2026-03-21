import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Trash2, Square, Settings, Clock, Zap } from 'lucide-react'
import SessionsList from './components/SessionsList'
import WatcherEventLog from './components/WatcherEventLog'
import AccountSelectionModal from './components/AccountSelectionModal'
import { JoinServerModal } from './components/JoinServerModal'
import PrivateServerModal from '@renderer/components/Modals/PrivateServerModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/components/UI/dialogs/Dialog'
import { Button } from '@renderer/components/UI/buttons/Button'
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
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showPrivateServerModal, setShowPrivateServerModal] = useState(false)
  const [selectedSessionForJoin, setSelectedSessionForJoin] = useState<WatcherSession | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [enableRAMLimiter, setEnableRAMLimiter] = useLocalStorage<boolean>('watcher-ram-limiter', false)
  const [ramLimit, setRamLimit] = useLocalStorage<number>('watcher-ram-limit', 800)
  const [enableRAMCleanupAttempts, setEnableRAMCleanupAttempts] = useLocalStorage<boolean>('watcher-ram-cleanup', true)
  const [enableClientTimeout, setEnableClientTimeout] = useLocalStorage<boolean>('watcher-client-timeout', false)
  const [clientTimeout, setClientTimeout] = useLocalStorage<number>('watcher-client-timeout-seconds', 3600)
  const [enableCPULimiter, setEnableCPULimiter] = useLocalStorage<boolean>('watcher-cpu-limiter', false)
  const [cpuLimit, setCPULimit] = useLocalStorage<number>('watcher-cpu-limit', 80)
  const [showLaunchChoiceModal, setShowLaunchChoiceModal] = useState(false)
  const [launchChoice, setLaunchChoice] = useState<'public' | 'private' | 'jobid' | 'username' | null>(null)
  const [launchJobId, setLaunchJobId] = useState('')
  const [launchUsername, setLaunchUsername] = useState('')
  const [launchPrivateServerLink, setLaunchPrivateServerLink] = useState('')
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

  const handleJoinSession = useCallback((session: WatcherSession) => {
    setSelectedSessionForJoin(session)
    setShowJoinModal(true)
  }, [])

  const handleJoinPrivateServerSession = useCallback((session: WatcherSession) => {
    setSelectedSessionForJoin(session)
    setShowPrivateServerModal(true)
  }, [])

  const handleJoinPublic = useCallback(async () => {
    if (!selectedSessionForJoin) return

    setIsJoining(true)
    try {
      const result = await window.api.watcher.joinGame(selectedSessionForJoin.accountId, selectedSessionForJoin.placeId)
      if (result?.success) {
        console.log(`[Watcher] Successfully joined public game for ${selectedSessionForJoin.username}`)
      } else {
        alert('Failed to join game')
      }
    } catch (error: any) {
      console.error('[Watcher] Error joining game:', error)
      alert(`Error joining game: ${error.message}`)
    } finally {
      setIsJoining(false)
      setShowJoinModal(false)
      setSelectedSessionForJoin(null)
    }
  }, [selectedSessionForJoin])

  const handleJoinPrivate = useCallback(async (jobId: string) => {
    if (!selectedSessionForJoin) return

    setIsJoining(true)
    try {
      const result = await window.api.watcher.joinPrivateServer(
        selectedSessionForJoin.accountId,
        jobId,
        selectedSessionForJoin.placeId
      )
      if (result?.success) {
        console.log(`[Watcher] Successfully joined private server for ${selectedSessionForJoin.username}`)
      } else {
        alert('Failed to join private server')
      }
    } catch (error: any) {
      console.error('[Watcher] Error joining private server:', error)
      alert(`Error joining private server: ${error.message}`)
    } finally {
      setIsJoining(false)
      setShowJoinModal(false)
      setSelectedSessionForJoin(null)
    }
  }, [selectedSessionForJoin])

  const handleJoinPrivateServerLink = useCallback(async (link: string, serverName?: string) => {
    if (!selectedSessionForJoin) return

    console.log(`[Watcher] Attempting to join private server with link: ${link}`)
    setIsJoining(true)
    try {
      console.log(`[Watcher] Calling launchGameWithUrl with accountId=${selectedSessionForJoin.accountId}, placeId=${selectedSessionForJoin.placeId}`)
      // Extract game URL and launch with the session's placeId and cookie
      const result = await window.api.watcher.launchGameWithUrl(
        selectedSessionForJoin.accountId,
        selectedSessionForJoin.placeId,
        link
      )
      console.log(`[Watcher] launchGameWithUrl result:`, result)
      if (result?.success) {
        console.log(`[Watcher] Successfully joined private server link for ${selectedSessionForJoin.username}`)
        alert('✓ Successfully joined private server!')
      } else {
        console.error(`[Watcher] Failed to join - result:`, result)
        alert('Failed to join private server')
      }
    } catch (error: any) {
      console.error('[Watcher] Error joining private server link:', error)
      alert(`Error joining private server: ${error.message}`)
    } finally {
      setIsJoining(false)
      setShowPrivateServerModal(false)
      setSelectedSessionForJoin(null)
    }
  }, [selectedSessionForJoin])

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

  const handleUpdateWatcherConfig = useCallback(async () => {
    try {
      await window.electron.ipcRenderer.invoke('watcher:set-config', {
        enableRAMLimiter,
        ramLimitMB: ramLimit,
        enableRAMCleanupAttempts,
        enableClientTimeout,
        clientTimeoutSeconds: clientTimeout,
        enableCPULimiter,
        cpuLimitPercent: cpuLimit,
        autoRestart: true,
        restartDelaySeconds: 5
      })
      setShowRAMSettings(false)
    } catch (error) {
      console.error('Failed to update watcher config:', error)
      alert('Failed to update watcher config')
    }
  }, [enableRAMLimiter, ramLimit, enableRAMCleanupAttempts, enableClientTimeout, clientTimeout, enableCPULimiter, cpuLimit])

  const handleToggleWatcher = useCallback(async () => {
    if (isWatcherRunning) {
      stopWatching()
      setIsWatcherRunning(false)
    } else {
      // Show launch choice modal if we have selected accounts
      if (selectedAccountIds.size > 0 && placeId) {
        // Clear inputs before opening modal
        setLaunchJobId('')
        setLaunchUsername('')
        setLaunchPrivateServerLink('')
        setShowLaunchChoiceModal(true)
      } else {
        // No accounts or place ID selected, just start watcher
        try {
          await window.electron.ipcRenderer.invoke('watcher:set-config', {
            enableRAMLimiter,
            ramLimitMB: ramLimit,
            enableClientTimeout,
            clientTimeoutSeconds: clientTimeout,
            enableCPULimiter,
            cpuLimitPercent: cpuLimit,
            autoRestart: true,
            restartDelaySeconds: 5
          })
        } catch (err) {
          console.error('Failed to set watcher config:', err)
        }

        await startWatching()
        setIsWatcherRunning(true)
      }
    }
  }, [isWatcherRunning, startWatching, stopWatching, selectedAccountIds, placeId, enableRAMLimiter, ramLimit])

  const handleLaunchWithChoice = useCallback(async (choice: 'public' | 'private' | 'jobid' | 'username') => {
    // Validate jobId if chosen
    if (choice === 'jobid' && !launchJobId.trim()) {
      alert('Please enter a Job ID')
      return
    }

    // Validate username if chosen
    if (choice === 'username' && !launchUsername.trim()) {
      alert('Please enter a username')
      return
    }

    // Validate private server link if chosen
    if (choice === 'private' && !launchPrivateServerLink.trim()) {
      console.error('[Watcher] Private server link validation failed:', { launchPrivateServerLink, trimmed: launchPrivateServerLink.trim() })
      alert('Please enter a private server link (https://www.roblox.com/games/...?privateServerLinkCode=...)')
      return
    }

    // Validate that private server link contains the link code
    if (choice === 'private') {
      const linkCodeMatch = launchPrivateServerLink.match(/privateServerLinkCode=(\d+)/)
      if (!linkCodeMatch) {
        console.error('[Watcher] Private server link code not found in:', launchPrivateServerLink)
        alert('Link must contain privateServerLinkCode parameter')
        return
      }
    }

    setShowLaunchChoiceModal(false)
    // Reset inputs
    setLaunchJobId('')
    setLaunchUsername('')
    setLaunchPrivateServerLink('')
    
    try {
      // Set watcher config
      await window.electron.ipcRenderer.invoke('watcher:set-config', {
        enableRAMLimiter,
        ramLimitMB: ramLimit,
        enableClientTimeout,
        clientTimeoutSeconds: clientTimeout,
        enableCPULimiter,
        cpuLimitPercent: cpuLimit,
        autoRestart: true,
        restartDelaySeconds: 5
      })
    } catch (err) {
      console.error('Failed to set watcher config:', err)
    }

    // Start watcher
    await startWatching()
    setIsWatcherRunning(true)

    // Launch all selected accounts
    if (selectedAccountIds.size > 0 && placeId) {
      setTimeout(async () => {
        for (const accountId of selectedAccountIds) {
          const account = accounts.find((a) => a.id === accountId)
          if (!account || !account.cookie) continue

          try {
            // Launch game based on choice
            let jobId: string | undefined
            let friendId: string | number | undefined

            if (choice === 'jobid') {
              jobId = launchJobId
            } else if (choice === 'username') {
              friendId = launchUsername
            } else if (choice === 'private') {
              // Extract privateServerLinkCode from URL
              try {
                const url = new URL(launchPrivateServerLink)
                const linkCode = url.searchParams.get('privateServerLinkCode')
                if (linkCode) {
                  jobId = linkCode
                } else {
                  // If no query param, use the whole link as fallback
                  jobId = launchPrivateServerLink
                }
              } catch {
                // If URL parsing fails, use the link as-is
                jobId = launchPrivateServerLink
              }
            }

            await window.api.launchGame(
              account.cookie,
              Number(placeId),
              jobId,
              friendId,
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
                placeId: Number(placeId),
                jobId: jobId,
                friendId: friendId
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
  }, [selectedAccountIds, placeId, accounts, startWatching, enableRAMLimiter, ramLimit, launchJobId, launchUsername])

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
              disabled={!isWatcherRunning && selectedAccountIds.size === 0}
              className={`flex-1 px-2 py-1 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors text-xs ${
                isWatcherRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : selectedAccountIds.size === 0
                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                    : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)]'
              }`}
              title={isWatcherRunning ? 'Stop watching' : selectedAccountIds.size === 0 ? 'Select accounts first' : 'Start watching'}
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

            {/* Watcher Settings Button - Controls RAM, Timeout, and CPU */}
            <button
              onClick={() => setShowRAMSettings(!showRAMSettings)}
              disabled={false}
              className="flex-1 px-2 py-1 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded font-medium flex items-center justify-center gap-0.5 transition-colors text-xs"
              title="Configure watcher settings (RAM, Timeout, CPU)"
            >
              <Settings className="w-3 h-3" />
              Settings
            </button>
          </div>

          {/* Unified Watcher Settings Panel */}
          {showRAMSettings && (
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
                        enableClientTimeout,
                        clientTimeoutSeconds: clientTimeout,
                        enableCPULimiter,
                        cpuLimitPercent: cpuLimit,
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

              {/* RAM Cleanup Attempts */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300">Attempt Cleanup Before Restart</label>
                <button
                  onClick={async () => {
                    const newState = !enableRAMCleanupAttempts
                    setEnableRAMCleanupAttempts(newState)
                    try {
                      await window.electron.ipcRenderer.invoke('watcher:set-config', {
                        enableRAMLimiter,
                        ramLimitMB: ramLimit,
                        enableRAMCleanupAttempts: newState,
                        enableClientTimeout,
                        clientTimeoutSeconds: clientTimeout,
                        enableCPULimiter,
                        cpuLimitPercent: cpuLimit,
                        autoRestart: true,
                        restartDelaySeconds: 5
                      })
                    } catch (error) {
                      console.error('Failed to update RAM cleanup config:', error)
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    enableRAMCleanupAttempts ? 'bg-[var(--accent-color)]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      enableRAMCleanupAttempts ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-neutral-500 leading-tight">Try EmptyWorkingSet 3x before restarting (Windows only)</p>

              {/* Divider */}
              <div className="border-t border-[var(--accent-color)]/20" />

              {/* Client Timeout Settings */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300">Enable Client Timeout</label>
                <button
                  onClick={async () => {
                    const newState = !enableClientTimeout
                    setEnableClientTimeout(newState)
                    try {
                      await window.electron.ipcRenderer.invoke('watcher:set-config', {
                        enableClientTimeout: newState,
                        clientTimeoutSeconds: clientTimeout,
                        enableRAMLimiter,
                        ramLimitMB: ramLimit,
                        enableCPULimiter,
                        cpuLimitPercent: cpuLimit,
                        autoRestart: true,
                        restartDelaySeconds: 5
                      })
                    } catch (error) {
                      console.error('Failed to update client timeout config:', error)
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    enableClientTimeout ? 'bg-[var(--accent-color)]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      enableClientTimeout ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {enableClientTimeout && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">Timeout (Seconds)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="60"
                      max="86400"
                      step="60"
                      value={clientTimeout}
                      onChange={(e) => setClientTimeout(Number(e.target.value))}
                      className="flex-1 px-2 py-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 leading-tight">Auto-restarts client after timeout</p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[var(--accent-color)]/20" />

              {/* CPU Limiter Settings */}
              {!isMac && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-300">Enable CPU Limiter</label>
                    <button
                      onClick={async () => {
                        const newState = !enableCPULimiter
                        setEnableCPULimiter(newState)
                        try {
                          await window.electron.ipcRenderer.invoke('watcher:set-config', {
                            enableCPULimiter: newState,
                            cpuLimitPercent: cpuLimit,
                            enableRAMLimiter,
                            ramLimitMB: ramLimit,
                            enableClientTimeout,
                            clientTimeoutSeconds: clientTimeout,
                            autoRestart: true,
                            restartDelaySeconds: 5
                          })
                        } catch (error) {
                          console.error('Failed to update CPU limiter config:', error)
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        enableCPULimiter ? 'bg-[var(--accent-color)]' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          enableCPULimiter ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {enableCPULimiter && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-300 block">Max CPU (%)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="10"
                          max="100"
                          step="5"
                          value={cpuLimit}
                          onChange={(e) => setCPULimit(Number(e.target.value))}
                          className="flex-1 px-2 py-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                        />
                      </div>
                      <p className="text-xs text-neutral-500 leading-tight">Auto-restarts processes exceeding CPU limit</p>
                    </div>
                  )}
                </>
              )}

              {isMac && (
                <p className="text-xs text-neutral-500 italic">CPU limiter is only available on Windows and Linux</p>
              )}

              <button
                onClick={handleUpdateWatcherConfig}
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
            onJoinSession={handleJoinSession}
            onJoinPrivateServer={handleJoinPrivateServerSession}
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

      {/* Join Server Modal */}
      {selectedSessionForJoin && (
        <JoinServerModal
          isOpen={showJoinModal}
          onClose={() => {
            setShowJoinModal(false)
            setSelectedSessionForJoin(null)
          }}
          onJoinPublic={handleJoinPublic}
          onJoinPrivate={handleJoinPrivate}
          onJoinPrivateLink={handleJoinPrivateServerLink}
          sessionUsername={selectedSessionForJoin.displayName || selectedSessionForJoin.username}
          isLoading={isJoining}
        />
      )}

      {/* Private Server Link Modal */}
      {selectedSessionForJoin && (
        <PrivateServerModal
          isOpen={showPrivateServerModal}
          onClose={() => {
            setShowPrivateServerModal(false)
            setSelectedSessionForJoin(null)
          }}
          onSubmit={handleJoinPrivateServerLink}
          isLoading={isJoining}
          sessionUsername={selectedSessionForJoin.displayName || selectedSessionForJoin.username}
        />
      )}

      {/* Launch Choice Modal - Where to join */}
      <Dialog isOpen={showLaunchChoiceModal} onClose={() => setShowLaunchChoiceModal(false)}>
        <DialogContent className="max-w-sm max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Where to Join?</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody className="py-2">
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                {selectedAccountIds.size} account{selectedAccountIds.size === 1 ? '' : 's'}
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleLaunchWithChoice('public')}
                  className="w-full px-3 py-2 rounded-lg border-2 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-left"
                >
                  <div className="font-medium text-xs text-blue-300">Public Server</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Join any public server
                  </div>
                </button>

                <div className="border-2 border-emerald-500/50 bg-emerald-500/10 rounded-lg p-2 space-y-1.5">
                  <label className="text-xs font-medium text-emerald-300 block">Private Server Link</label>
                  <input
                    autoFocus
                    type="text"
                    value={launchPrivateServerLink}
                    onChange={(e) => setLaunchPrivateServerLink(e.target.value)}
                    placeholder="Paste: https://roblox.com/games/..."
                    className="w-full px-2 py-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-xs placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleLaunchWithChoice('private')}
                    disabled={!launchPrivateServerLink.trim()}
                    className="w-full px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium text-xs transition-colors"
                  >
                    Join
                  </button>
                </div>

                <div className="border-2 border-purple-500/50 bg-purple-500/10 rounded-lg p-2 space-y-1.5">
                  <label className="text-xs font-medium text-purple-300 block">Job ID</label>
                  <input
                    type="text"
                    value={launchJobId}
                    onChange={(e) => setLaunchJobId(e.target.value)}
                    placeholder="Job ID"
                    className="w-full px-2 py-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-xs placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  />
                  <button
                    onClick={() => handleLaunchWithChoice('jobid')}
                    disabled={!launchJobId.trim()}
                    className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium text-xs transition-colors"
                  >
                    Join
                  </button>
                </div>

                <div className="border-2 border-amber-500/50 bg-amber-500/10 rounded-lg p-2 space-y-1.5">
                  <label className="text-xs font-medium text-amber-300 block">Username</label>
                  <input
                    type="text"
                    value={launchUsername}
                    onChange={(e) => setLaunchUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-2 py-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-xs placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                  <button
                    onClick={() => handleLaunchWithChoice('username')}
                    disabled={!launchUsername.trim()}
                    className="w-full px-2 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium text-xs transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
