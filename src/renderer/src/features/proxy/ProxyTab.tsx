import React, { useState, useEffect } from 'react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/UI/display/Card'
import { Network, Plus, Zap, Trash2, Copy, CheckCircle2, XCircle } from 'lucide-react'

interface Proxy {
  id: string
  host: string
  port: number
  username?: string
  password?: string
  status: 'alive' | 'dead'
  latency: number
  testedAt?: number
}

export const ProxyTab = () => {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [aliveCount, setAliveCount] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProxyMode, setNewProxyMode] = useState<'single' | 'bulk'>('single')
  const [singleProxy, setSingleProxy] = useState({ host: '', port: 8080, username: '', password: '' })
  const [bulkProxies, setBulkProxies] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  // Auto-swap state
  const [showAutoSwapSettings, setShowAutoSwapSettings] = useState(false)
  const [autoSwapEnabled, setAutoSwapEnabled] = useState(false)
  const [autoSwapIntervalHours, setAutoSwapIntervalHours] = useState(1)
  const [autoSwapTestBeforeSwap, setAutoSwapTestBeforeSwap] = useState(true)
  const [autoSwapRunning, setAutoSwapRunning] = useState(false)

  useEffect(() => {
    loadProxies()
    loadAutoSwapConfig()
  }, [])

  const loadAutoSwapConfig = async () => {
    try {
      const [configResult, runningResult] = await Promise.all([
        window.api.proxy.getAutoSwapConfig(),
        window.api.proxy.isAutoSwapRunning()
      ])
      
      if (configResult.success && configResult.config) {
        setAutoSwapEnabled(configResult.config.enabled || false)
        setAutoSwapIntervalHours(configResult.config.intervalHours || 1)
        setAutoSwapTestBeforeSwap(configResult.config.autoTestBeforeSwap ?? true)
      }
      
      if (runningResult.isRunning !== undefined) {
        setAutoSwapRunning(runningResult.isRunning)
      }
    } catch (err) {
      console.error('Failed to load auto-swap config:', err)
    }
  }

  const handleStartAutoSwap = async () => {
    try {
      await window.api.proxy.startAutoSwap(autoSwapIntervalHours, autoSwapTestBeforeSwap)
      setAutoSwapRunning(true)
      setAutoSwapEnabled(true)
    } catch (err) {
      console.error('Failed to start auto-swap:', err)
    }
  }

  const handleStopAutoSwap = async () => {
    try {
      await window.api.proxy.stopAutoSwap()
      setAutoSwapRunning(false)
      setAutoSwapEnabled(false)
    } catch (err) {
      console.error('Failed to stop auto-swap:', err)
    }
  }

  useEffect(() => {
    const alive = proxies.filter((p) => p.status === 'alive').length
    setAliveCount(alive)
  }, [proxies])

  const loadProxies = async () => {
    try {
      const result = await window.api.proxy.getAllProxies()
      if (result.success) {
        setProxies(result.proxies || [])
      }
    } catch (err) {
      console.error('Failed to load proxies:', err)
    }
  }

  const handleAddSingleProxy = async () => {
    if (!singleProxy.host) return

    try {
      const result = await window.api.proxy.addProxy(
        singleProxy.host,
        singleProxy.port,
        singleProxy.username || undefined,
        singleProxy.password || undefined
      )

      if (result.success) {
        setProxies([...proxies, result.proxy])
        setSingleProxy({ host: '', port: 8080, username: '', password: '' })
        setShowAddForm(false)
      }
    } catch (err) {
      console.error('Failed to add proxy:', err)
    }
  }

  const handleAddBulkProxies = async () => {
    if (!bulkProxies.trim()) return

    const proxyList = bulkProxies
      .trim()
      .split('\n')
      .filter((line) => line.trim())

    try {
      const result = await window.api.proxy.addProxyList(proxyList)

      if (result.success) {
        await loadProxies()
        setBulkProxies('')
        setShowAddForm(false)
      }
    } catch (err) {
      console.error('Failed to add proxies:', err)
    }
  }

  const handleTestAllProxies = async () => {
    setIsTesting(true)
    try {
      const result = await window.api.proxy.testAllProxies()

      if (result.success) {
        await loadProxies()
      }
    } catch (err) {
      console.error('Failed to test proxies:', err)
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestProxy = async (proxyId: string) => {
    try {
      const result = await window.api.proxy.testProxy(proxyId)

      if (result.success) {
        await loadProxies()
      }
    } catch (err) {
      console.error('Failed to test proxy:', err)
    }
  }

  const handleRemoveProxy = async (proxyId: string) => {
    try {
      const result = await window.api.proxy.removeProxy(proxyId)

      if (result.success) {
        setProxies(proxies.filter((p) => p.id !== proxyId))
      }
    } catch (err) {
      console.error('Failed to remove proxy:', err)
    }
  }

  const handleClearAllProxies = async () => {
    if (!confirm('Are you sure you want to clear all proxies?')) return

    try {
      await window.api.proxy.clearAllProxies()
      setProxies([])
    } catch (err) {
      console.error('Failed to clear proxies:', err)
    }
  }



  return (
    <div className="space-y-6">
      {/* Statistics & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Proxy Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Proxies</p>
              <p className="text-2xl font-bold">{proxies.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Alive</p>
              <p className="text-2xl font-bold text-green-600">{aliveCount}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Dead</p>
              <p className="text-2xl font-bold text-red-600">{proxies.length - aliveCount}</p>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <Button
              onClick={handleTestAllProxies}
              disabled={isTesting || proxies.length === 0}
              className="flex-1 min-w-32"
            >
              <Zap className="w-4 h-4 mr-2" />
              {isTesting ? 'Testing...' : 'Test All'}
            </Button>

            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="outline"
              className="flex-1 min-w-32"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Proxies
            </Button>
            {proxies.length > 0 && (
              <Button
                onClick={handleClearAllProxies}
                variant="ghost"
                className="text-red-500 hover:bg-red-50 flex-1 min-w-32"
              >
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Swap Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Auto-Swap Proxies
            </div>
            <Button
              onClick={() => setShowAutoSwapSettings(!showAutoSwapSettings)}
              variant="ghost"
              size="sm"
            >
              {showAutoSwapSettings ? 'Hide' : 'Show'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Swap Status</p>
              <p className="text-xs text-gray-600">
                {autoSwapRunning ? '✓ Running' : '○ Stopped'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleStartAutoSwap}
                disabled={autoSwapRunning || !autoSwapIntervalHours}
                variant={autoSwapRunning ? 'outline' : 'default'}
                size="sm"
              >
                Start
              </Button>
              <Button
                onClick={handleStopAutoSwap}
                disabled={!autoSwapRunning}
                variant="destructive"
                size="sm"
              >
                Stop
              </Button>
            </div>
          </div>

          {showAutoSwapSettings && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium block mb-2">
                  Swap Interval (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={autoSwapIntervalHours}
                  onChange={(e) => setAutoSwapIntervalHours(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={autoSwapRunning}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Proxies will rotate every {autoSwapIntervalHours} hour(s)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="testBeforeSwap"
                  checked={autoSwapTestBeforeSwap}
                  onChange={(e) => setAutoSwapTestBeforeSwap(e.target.checked)}
                  className="w-4 h-4 rounded"
                  disabled={autoSwapRunning}
                />
                <label htmlFor="testBeforeSwap" className="text-sm">
                  Test all proxies before swapping
                </label>
              </div>

              {autoSwapRunning && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    ℹ️ Auto-swap is running. Next rotation will swap proxies after {autoSwapIntervalHours} hour(s). To change settings, stop the auto-swap first.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Proxy Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Proxies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={newProxyMode === 'single'}
                  onChange={() => setNewProxyMode('single')}
                />
                <span className="text-sm">Single Proxy</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={newProxyMode === 'bulk'}
                  onChange={() => setNewProxyMode('bulk')}
                />
                <span className="text-sm">Bulk Import</span>
              </label>
            </div>

            {newProxyMode === 'single' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Host</label>
                    <input
                      type="text"
                      placeholder="192.168.1.1"
                      value={singleProxy.host}
                      onChange={(e) => setSingleProxy({ ...singleProxy, host: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Port</label>
                    <input
                      type="number"
                      value={singleProxy.port}
                      onChange={(e) => setSingleProxy({ ...singleProxy, port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Username (optional)</label>
                  <input
                    type="text"
                    value={singleProxy.username}
                    onChange={(e) => setSingleProxy({ ...singleProxy, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Password (optional)</label>
                  <input
                    type="password"
                    value={singleProxy.password}
                    onChange={(e) => setSingleProxy({ ...singleProxy, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <Button onClick={handleAddSingleProxy} className="w-full">
                  Add Proxy
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Proxies (one per line)</label>
                  <p className="text-xs text-gray-500 mb-2">Format: IP:PORT or USER:PASS@IP:PORT</p>
                  <textarea
                    value={bulkProxies}
                    onChange={(e) => setBulkProxies(e.target.value)}
                    placeholder="192.168.1.1:8080&#10;user:pass@192.168.1.2:8080"
                    rows={8}
                    className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm"
                  />
                </div>
                <Button onClick={handleAddBulkProxies} className="w-full">
                  Import Proxies
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proxies List */}
      <Card>
        <CardHeader>
          <CardTitle>Proxies</CardTitle>
        </CardHeader>
        <CardContent>
          {proxies.length === 0 ? (
            <p className="text-sm text-gray-500">No proxies added yet. Click "Add Proxies" to get started.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {proxies.map((proxy) => (
                <div
                  key={proxy.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {proxy.status === 'alive' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {proxy.host}:{proxy.port}
                        {proxy.username && ` (${proxy.username})`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {proxy.status === 'alive' ? `Latency: ${proxy.latency}ms` : 'Dead'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleTestProxy(proxy.id)}
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-blue-50"
                    >
                      <Zap className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleRemoveProxy(proxy.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
