import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/UI/display/Card'
import { Play, Pause, Square, Download, Trash2, AlertCircle, Upload, X, Settings, Copy, Key, Clipboard, Plus } from 'lucide-react'
import { useAccountsManager } from '../auth/api/useAccounts'
import { AccountStatus } from '@renderer/types'
import { v4 as uuidv4 } from 'uuid'

interface SniperResult {
  valid: string[]
  taken: string[]
  censored: string[]
  progress: number
  status: 'idle' | 'running' | 'paused' | 'completed'
  currentLoop: number
  totalLoops: number
}

export const SniperTab = () => {
  // Try to restore sessionId from sessionStorage on mount (clears on app restart)
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sniper_sessionId') || ''
    }
    return ''
  })
  const [usernames, setUsernames] = useState<string[]>([])
  const [results, setResults] = useState<SniperResult>({
    valid: [],
    taken: [],
    censored: [],
    progress: 0,
    status: 'idle',
    currentLoop: 0,
    totalLoops: 1,
  })
  const [fileName, setFileName] = useState<string>('')
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false)
  const [loopCount, setLoopCount] = useState<number>(1)
  const [checkInterval, setCheckInterval] = useState<number>(200)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [autoGenerate, setAutoGenerate] = useState<boolean>(false)
  const [generatedAccounts, setGeneratedAccounts] = useState<any[]>([])
  const [accountPasswords, setAccountPasswords] = useState<Map<string, string>>(new Map())
  const [isAddingToAccounts, setIsAddingToAccounts] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const unsubscribersRef = useRef<Array<() => void>>([])
  const isRunningRef = useRef(false)
  const { addAccount } = useAccountsManager()

  // Save sessionId to sessionStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('sniper_sessionId', sessionId)
    } else {
      sessionStorage.removeItem('sniper_sessionId')
    }
  }, [sessionId])

  // Load sniper accounts from encrypted storage on mount
  useEffect(() => {
    loadSniperAccounts()
  }, [])

  const loadSniperAccounts = async () => {
    try {
      const result = await window.api.generator.sniperGetAccounts()
      if (result.success && result.accounts) {
        setGeneratedAccounts(result.accounts)
      }
    } catch (err) {
      console.error('[SniperTab] Failed to load sniper accounts:', err)
    }
  }

  // Set up persistent listeners and re-attach on visibility change
  useEffect(() => {
    const setupListeners = () => {
      // Clean up old listeners first
      unsubscribersRef.current.forEach(unsub => {
        try { unsub() } catch (err) {}
      })
      unsubscribersRef.current = []

      // Set up new listeners
      const unsubscribeValid = window.api.sniper.onValid((data) => {
        console.log(`[SniperTab] onValid event received:`, data)
        setResults((prev) => ({
          ...prev,
          valid: [...prev.valid, data.username],
        }))
        console.log(`[SniperTab] autoGenerate state:`, autoGenerate)
        if (autoGenerate) {
          console.log(`[SniperTab] AUTO-GENERATE ENABLED - Calling createAccountWithUsername for: ${data.username}`)
          window.api.generator.createAccountWithUsername(data.username)
            .then(result => {
              console.log(`[SniperTab] Auto-generate SUCCESS result:`, result)
              if (result.success && result.username && result.password) {
                trackGeneratedAccount(result.username, result.password)
              }
            })
            .catch(err => {
              console.error(`[SniperTab] Auto-generate FAILED error:`, err)
            })
        } else {
          console.log(`[SniperTab] AUTO-GENERATE NOT ENABLED - Skipping account creation`)
        }
      })

      const unsubscribeTaken = window.api.sniper.onTaken((data) => {
        setResults((prev) => ({
          ...prev,
          taken: [...prev.taken, data.username],
        }))
      })

      const unsubscribeCensored = window.api.sniper.onCensored((data) => {
        setResults((prev) => ({
          ...prev,
          censored: [...prev.censored, data.username],
        }))
      })

      const unsubscribeProgress = window.api.sniper.onProgress((data) => {
        setResults((prev) => ({
          ...prev,
          progress: (data.checked / data.total) * 100,
          currentLoop: data.loop,
          totalLoops: data.totalLoops,
        }))
      })

      const unsubscribeCompleted = window.api.sniper.onCompleted((data) => {
        isRunningRef.current = false
        setResults((prev) => ({
          ...prev,
          status: 'completed',
        }))
      })

      const unsubscribeError = window.api.sniper.onError((data) => {
        console.error('[Frontend] onError:', data)
      })

      unsubscribersRef.current = [
        unsubscribeValid,
        unsubscribeTaken,
        unsubscribeCensored,
        unsubscribeProgress,
        unsubscribeCompleted,
        unsubscribeError,
      ]
    }

    // Setup listeners on mount
    setupListeners()

    // Re-setup listeners when tab regains visibility
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setupListeners()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      unsubscribersRef.current.forEach(unsub => {
        try { unsub() } catch (err) {}
      })
      unsubscribersRef.current = []
    }
  }, [autoGenerate])

  // Sync with backend when tab regains focus
  useEffect(() => {
    const syncSessionState = async () => {
      if (!sessionId) return

      try {
        const session = await window.api.sniper.getSession(sessionId)
        if (session.success && session.session) {
          const sess = session.session
          
          // Restore usernames and fileName
          setUsernames(sess.usernames || [])
          if (sess.usernames && sess.usernames.length > 0) {
            setFileName(`${sess.usernames.length} usernames`)
          }
          
          // Sync results state from backend
          setResults({
            valid: sess.valid || [],
            taken: sess.taken || [],
            censored: sess.censored || [],
            progress: sess.checked ? (sess.checked / sess.usernames.length) * 100 : 0,
            status: sess.status as 'idle' | 'running' | 'paused' | 'completed',
            currentLoop: sess.currentLoop || 0,
            totalLoops: sess.totalLoops || 1,
          })

          isRunningRef.current = sess.status === 'running'
        }
      } catch (error) {
        console.error('Failed to sync:', error)
      }
    }

    // Always sync on mount if sessionId exists
    if (sessionId) {
      syncSessionState()
    }

    // Sync when page regains visibility
    const handleVisibilityChange = () => {
      if (!document.hidden && sessionId) {
        syncSessionState()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sessionId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      setUsernames(lines)

      try {
        // Proxies are optional - sniper will work without them
        let proxyUrls: string[] = []
        try {
          const allProxies = await window.api.proxy.getAllProxies()
          proxyUrls = allProxies.success && allProxies.proxies 
            ? allProxies.proxies.map((p: any) => `${p.host}:${p.port}`)
            : []
        } catch (err) {
          console.warn('Proxies unavailable, sniper will run without them')
        }

        const response = await window.api.sniper.createSession(lines, proxyUrls, loopEnabled, loopCount, checkInterval)
        if (response.success && response.sessionId) {
          setSessionId(response.sessionId)
          setResults({
            valid: [],
            taken: [],
            censored: [],
            progress: 0,
            status: 'idle' as const,
            currentLoop: 0,
            totalLoops: loopCount
          } as SniperResult)
        }
      } catch (error) {
        console.error('Failed to create sniper session:', error)
      }
    }
    reader.readAsText(file)
  }

  const handleStartSniper = async () => {
    if (!sessionId) return

    try {
      // Mark as running - persistent listeners are already set up
      isRunningRef.current = true
      
      // Clear previous results and update UI
      setResults((prev) => ({ 
        ...prev, 
        status: 'running', 
        valid: [], 
        taken: [], 
        censored: [], 
        progress: 0 
      }))
      
      // Start the sniper - listeners will receive events
      const response = await window.api.sniper.startSniper(sessionId)
      if (!response.success) {
        console.error('Failed to start sniper:', response.error)
        isRunningRef.current = false
        setResults((prev) => ({ ...prev, status: 'idle' }))
      }
    } catch (error) {
      console.error('Failed to start sniper:', error)
      isRunningRef.current = false
      setResults((prev) => ({ ...prev, status: 'idle' }))
    }
  }

  const handlePauseSniper = async () => {
    if (!sessionId) return

    try {
      const response = await window.api.sniper.pauseSession(sessionId)
      if (response.success) {
        setResults((prev) => ({ ...prev, status: 'paused' }))
      }
    } catch (error) {
      console.error('Failed to pause sniper:', error)
    }
  }

  const handleStopSniper = async () => {
    if (!sessionId) return

    try {
      isRunningRef.current = false
      const response = await window.api.sniper.stopSession(sessionId)
      if (response.success) {
        setResults((prev) => ({ ...prev, status: 'idle' }))
      }
    } catch (error) {
      console.error('Failed to stop sniper:', error)
    }
  }

  const handleExportValid = async () => {
    if (results.valid.length === 0) return

    const content = results.valid.join('\n')
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content))
    element.setAttribute('download', 'valid_usernames.txt')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleClearSession = async () => {
    if (!sessionId) return

    try {
      isRunningRef.current = false
      const response = await window.api.sniper.clearSession(sessionId)
      if (response.success) {
        setSessionId('')
        setUsernames([])
        setResults({ valid: [], taken: [], censored: [], progress: 0, status: 'idle', currentLoop: 0, totalLoops: 1 })
        setFileName('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  const trackGeneratedAccount = (account: any) => {
    // Account is already added to storage by GeneratorService
    // Just reload the list
    loadSniperAccounts()
  }

  const handleAddToAccounts = async (account: any) => {
    setIsAddingToAccounts(account.id)
    try {
      // Step 1: Fetch user data by username (userId, displayName, etc)
      let userId = ''
      let displayName = account.username
      let avatarUrl = ''
      
      try {
        const userResult = await window.api.user.getUserByUsername(account.username)
        if (userResult) {
          userId = String(userResult.id || '')
          displayName = userResult.displayName || account.username
        }
      } catch (err) {
        console.error('[SniperTab] Failed to fetch user by username:', err)
      }

      // Step 2: Fetch avatar URL
      try {
        const avatarResult = await window.api.user.getAvatarUrlByUsername(account.username)
        avatarUrl = avatarResult?.url || ''
      } catch (err) {
        console.error('[SniperTab] Failed to fetch avatar for', account.username, ':', err)
      }

      // Step 3: Create and add the account with all fetched data
      addAccount({
        id: uuidv4(),
        username: account.username,
        displayName: displayName,
        userId: userId,
        cookie: account.cookie || undefined,
        password: account.password,
        status: AccountStatus.Offline,
        avatarUrl: avatarUrl,
        lastActive: new Date().toISOString(),
        robuxBalance: 0,
        friendCount: 0,
        followerCount: 0,
        followingCount: 0
      })
    } catch (err) {
      console.error('[SniperTab] Failed to add account to accounts tab:', err)
      alert('Failed to add account to accounts tab')
    } finally {
      setIsAddingToAccounts(null)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm('Delete this account?')) {
      try {
        const result = await window.api.generator.sniperRemoveAccount(accountId)
        if (result.success) {
          await loadSniperAccounts()
        } else {
          alert('Failed to delete account')
        }
      } catch (err) {
        console.error('[SniperTab] Failed to delete account:', err)
        alert('Failed to delete account')
      }
    }
  }

  const handleClearAllAccounts = async () => {
    if (confirm('Delete all generated accounts?')) {
      try {
        for (const account of generatedAccounts) {
          await window.api.generator.sniperRemoveAccount(account.id)
        }
        setGeneratedAccounts([])
      } catch (err) {
        console.error('[SniperTab] Failed to clear accounts:', err)
        alert('Failed to clear accounts')
      }
    }
  }

  const handleBulkCopy = async () => {
    try {
      const copyData = generatedAccounts.map((account) => {
        const password = account.password || ''
        const cookie = account.cookie || ''
        return `${account.username}:${password}:${cookie}`
      })
      await navigator.clipboard.writeText(copyData.join('\n'))
      alert(`Copied ${copyData.length} accounts to clipboard`)
    } catch (err) {
      console.error('[SniperTab] Failed to bulk copy:', err)
      alert('Failed to copy accounts')
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-app-bg)] text-[var(--color-text-primary)] font-sans">
      {/* Header with title and status */}
      <div className="border-b border-[var(--color-border)] p-4">
        <h1 className="text-2xl font-bold mb-2">Sniper</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          Scan for available usernames and check their status
        </p>

        {/* File Upload Section */}
        <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username List</label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  disabled={!!sessionId}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={!!sessionId} 
                  className="w-full h-9 text-sm"
                >
                  Choose .txt File
                </Button>
              </div>
              <Button 
                onClick={() => setShowSettings(!showSettings)}
                disabled={!!sessionId}
                variant="outline"
                className="h-9 px-3"
                title="Sniper settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            {fileName && (
              <div className="flex gap-2 items-center mt-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 flex-1">📄 {fileName} ({usernames.length} usernames)</p>
                <Button
                  onClick={handleClearSession}
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  title="Change file"
                >
                  <X className="w-3 h-3 mr-1" />
                  Change
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 space-y-3">
          <h3 className="text-sm font-semibold">Settings</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={loopEnabled}
                  onChange={(e) => setLoopEnabled(e.target.checked)}
                  disabled={!!sessionId}
                  className="rounded w-4 h-4"
                />
                <span className="text-sm">Loop Scan</span>
              </label>
              {loopEnabled && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--color-text-muted)]">Times:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={loopCount}
                    onChange={(e) => setLoopCount(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!!sessionId}
                    className="w-14 px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-700"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm flex-1">Check Interval (ms)</label>
              <input
                type="number"
                min="1"
                max="5000"
                step="1"
                value={checkInterval}
                onChange={(e) => setCheckInterval(Math.max(1, parseInt(e.target.value) || 200))}
                disabled={!!sessionId}
                className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="rounded w-4 h-4"
                />
                <span className="text-sm">Auto-Generate on Valid</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Status Section */}
      {results.status !== 'idle' && (
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4">
          <div className="grid grid-cols-4 gap-2 text-sm mb-3">
            <div className="p-2 bg-[var(--color-input-bg)] rounded">
              <div className="text-[var(--color-text-muted)] text-xs">Status</div>
              <div className="font-semibold text-blue-500">{results.status.toUpperCase()}</div>
            </div>
            <div className="p-2 bg-[var(--color-input-bg)] rounded">
              <div className="text-[var(--color-text-muted)] text-xs">Valid</div>
              <div className="font-semibold text-green-500">{results.valid.length}</div>
            </div>
            <div className="p-2 bg-[var(--color-input-bg)] rounded">
              <div className="text-[var(--color-text-muted)] text-xs">Taken</div>
              <div className="font-semibold text-yellow-500">{results.taken.length}</div>
            </div>
            <div className="p-2 bg-[var(--color-input-bg)] rounded">
              <div className="text-[var(--color-text-muted)] text-xs">Censored</div>
              <div className="font-semibold text-red-500">{results.censored.length}</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Progress</span>
              <span className="font-mono">{Math.round(results.progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${results.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Control Buttons */}
        {sessionId && (
          <div className="flex gap-2">
            {results.status === 'idle' && (
              <Button onClick={handleStartSniper} className="flex-1 h-9 text-sm flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Start Scan
              </Button>
            )}

            {results.status === 'running' && (
              <>
                <Button
                  onClick={handlePauseSniper}
                  variant="outline"
                  className="flex-1 h-9 text-sm flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button
                  onClick={handleStopSniper}
                  variant="destructive"
                  className="flex-1 h-9 text-sm flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}

            {results.status === 'paused' && (
              <>
                <Button onClick={handleStartSniper} className="flex-1 h-9 text-sm flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
                <Button
                  onClick={handleStopSniper}
                  variant="destructive"
                  className="flex-1 h-9 text-sm flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}

            {results.status === 'completed' && (
              <Button onClick={handleClearSession} className="flex-1 h-9 text-sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Session
              </Button>
            )}
          </div>
        )}

        {!sessionId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">Upload a .txt file with usernames to start scanning</p>
          </div>
        )}

        {/* Valid Usernames Section */}
        {results.valid.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-lg p-3 border border-green-500/30">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">
                ✓ Valid Usernames ({results.valid.length})
              </h3>
              <div className="flex gap-2">
                <Button 
                  onClick={async () => {
                    const bulkText = results.valid.join('\n')
                    await navigator.clipboard.writeText(bulkText)
                    alert(`Copied ${results.valid.length} usernames to clipboard`)
                  }}
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                  title="Copy all valid usernames"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy All
                </Button>
                <Button 
                  onClick={handleExportValid} 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.valid.map((username, idx) => (
                <div 
                  key={idx} 
                  className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded flex justify-between items-center"
                >
                  <span className="font-mono truncate">{username}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(username)}
                    className="ml-2 opacity-60 hover:opacity-100"
                    title="Copy username"
                  >
                    📋
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Accounts List - Card Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Accounts ({generatedAccounts.length})</span>
              {generatedAccounts.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkCopy}
                    size="sm"
                    variant="outline"
                    className="text-purple-600 hover:text-purple-700"
                    title="Copy all in username:password:cookie format"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Bulk Copy
                  </Button>
                  <Button
                    onClick={handleClearAllAccounts}
                    size="sm"
                    variant="ghost"
                    className="text-red-500"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedAccounts.length === 0 ? (
              <p className="text-sm text-gray-500">No accounts generated yet. Enable auto-generate in settings when sniper finds valid usernames.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{account.username}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(account.lastActive).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const password = account.password || ''
                            const cookie = account.cookie || ''
                            const fullData = `${account.username}:${password}:${cookie}`
                            await navigator.clipboard.writeText(fullData)
                          } catch (err) {
                            console.error('Failed to copy account data:', err)
                          }
                        }}
                        className="text-gray-500 hover:text-purple-400 transition-colors p-1"
                        title="Copy username:password:cookie"
                      >
                        <Clipboard className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            if (account.password) {
                              await navigator.clipboard.writeText(account.password)
                            } else {
                              alert('Password not available')
                            }
                          } catch (err) {
                            console.error('Failed to copy password:', err)
                          }
                        }}
                        className="text-gray-500 hover:text-blue-400 transition-colors p-1"
                        title="Copy password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAccount(account.id)
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Delete account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToAccounts(account)
                        }}
                        disabled={isAddingToAccounts === account.id}
                        className="text-gray-500 hover:text-green-400 transition-colors p-1"
                        title="Add to accounts tab"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SniperTab