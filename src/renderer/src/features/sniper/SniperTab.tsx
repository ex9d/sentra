import React, { useState, useEffect } from 'react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/UI/display/Card'
import { Play, StopCircle, Settings, Trash2, Eye, Plus, X } from 'lucide-react'

interface SniperConfig {
  minProfit: number
  maxPurchasePrice: number
  targetItemIds: number[]
  enabled: boolean
  pollingIntervalMs: number
}

interface SniperItem {
  id: number
  name: string
  targetId: number
  purchasePrice: number
  resaleValue: number
  profit: number
  profitPercent: number
  timestamp: number
}

interface SniperLogEntry {
  timestamp: number
  itemId: number
  itemName: string
  action: 'purchased' | 'monitored' | 'skipped' | 'error'
  profit?: number
  reason?: string
}

interface LimitedItemWatch {
  itemId: number
  itemName: string
  minProfitPercent: number
  currentRAP: number
  currentValue: number
  lastUpdated: number
  enabled: boolean
}

export const SniperTab = () => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitoredItems, setMonitoredItems] = useState<SniperItem[]>([])
  const [history, setHistory] = useState<SniperLogEntry[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [limitedWatches, setLimitedWatches] = useState<LimitedItemWatch[]>([])
  const [newItemId, setNewItemId] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newProfitPercent, setNewProfitPercent] = useState('15')
  const [addingWatch, setAddingWatch] = useState(false)

  // Load initial data
  useEffect(() => {
    loadMonitoredItems()
    loadHistory()
    loadLimitedWatches()
  }, [])

  // Auto-refresh monitored items (no interval config anymore, fixed 5 second polling)
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      loadMonitoredItems()
    }, 5000)

    return () => clearInterval(interval)
  }, [isMonitoring])

  const loadMonitoredItems = async () => {
    try {
      const result = await window.api.sniper.getMonitoredItems()
      if (result.success) {
        setMonitoredItems(result.items || [])
      }
    } catch (err) {
      console.error('Failed to load monitored items:', err)
    }
  }

  const loadHistory = async () => {
    try {
      const result = await window.api.sniper.getHistory(50)
      if (result.success) {
        setHistory(result.history || [])
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const loadLimitedWatches = async () => {
    try {
      const result = await window.api.sniper.getLimitedWatches()
      if (result.success && result.watches) {
        setLimitedWatches(result.watches)
      }
    } catch (err) {
      console.error('Failed to load limited watches:', err)
    }
  }

  const handleAddWatch = async () => {
    if (!newItemId || !newItemName) {
      alert('Please enter both item ID and name')
      return
    }

    setAddingWatch(true)
    try {
      const profitPercent = parseFloat(newProfitPercent) || 15
      const result = await window.api.sniper.addLimitedWatch(
        parseInt(newItemId),
        newItemName,
        profitPercent
      )
      if (result.success && result.watches) {
        setLimitedWatches(result.watches)
        setNewItemId('')
        setNewItemName('')
        setNewProfitPercent('15')
      }
    } catch (err) {
      console.error('Failed to add watch:', err)
      alert('Failed to add limited item watch')
    } finally {
      setAddingWatch(false)
    }
  }

  const handleRemoveWatch = async (itemId: number) => {
    try {
      const result = await window.api.sniper.removeLimitedWatch(itemId)
      if (result.success && result.watches) {
        setLimitedWatches(result.watches)
      }
    } catch (err) {
      console.error('Failed to remove watch:', err)
      alert('Failed to remove limited item watch')
    }
  }

  const handleUpdateWatch = async (itemId: number, updates: Partial<LimitedItemWatch>) => {
    try {
      const result = await window.api.sniper.updateLimitedWatch(itemId, updates)
      if (result.success && result.watches) {
        setLimitedWatches(result.watches)
      }
    } catch (err) {
      console.error('Failed to update watch:', err)
    }
  }

  const handleStartMonitoring = async () => {
    try {
      await window.api.sniper.startMonitoring()
      setIsMonitoring(true)
    } catch (err) {
      console.error('Failed to start monitoring:', err)
    }
  }

  const handleStopMonitoring = async () => {
    try {
      await window.api.sniper.stopMonitoring()
      setIsMonitoring(false)
    } catch (err) {
      console.error('Failed to stop monitoring:', err)
    }
  }

  const handleClearHistory = async () => {
    try {
      await window.api.sniper.clearHistory()
      setHistory([])
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Sniper Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleStartMonitoring}
              disabled={isMonitoring}
              variant={isMonitoring ? 'outline' : 'default'}
              className="flex-1"
            >
              Start Monitoring
            </Button>
            <Button
              onClick={handleStopMonitoring}
              disabled={!isMonitoring}
              variant={isMonitoring ? 'destructive' : 'outline'}
              className="flex-1"
            >
              Stop Monitoring
            </Button>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="icon"
              title="Open limited items settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {isMonitoring && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Monitoring Active</p>
              <p className="text-xs text-gray-600">Polling every 5000ms</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Section - Limited Items Only */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Limited Items Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Watch Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold">Add Limited Item to Watch</h3>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="number"
                  placeholder="Item ID (e.g., 123456)"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                />
                <input
                  type="text"
                  placeholder="Item Name (e.g., 'Limited Sword')"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                />
                <input
                  type="number"
                  placeholder="Minimum Profit % (default: 15)"
                  value={newProfitPercent}
                  onChange={(e) => setNewProfitPercent(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                />
                <Button
                  onClick={handleAddWatch}
                  disabled={!newItemId || !newItemName || addingWatch}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {addingWatch ? 'Adding...' : 'Add Watch'}
                </Button>
              </div>
            </div>

            {/* Watches List */}
            {limitedWatches.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No limited items being monitored</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {limitedWatches.map((watch) => (
                  <div
                    key={watch.itemId}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{watch.itemName}</p>
                        <p className="text-xs text-gray-500">ID: {watch.itemId}</p>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600 mt-1">
                        <p>RAP: {watch.currentRAP}</p>
                        <p>Value: {watch.currentValue}</p>
                        <p className="font-medium">Min profit: {watch.minProfitPercent}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={watch.enabled}
                        onChange={(e) => handleUpdateWatch(watch.itemId, { enabled: e.target.checked })}
                        className="w-4 h-4 rounded"
                        title="Enable/disable this watch"
                      />
                      <Button
                        onClick={() => handleRemoveWatch(watch.itemId)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitored Items Section */}
      <Card>
        <CardHeader>
          <CardTitle>Monitored Items ({monitoredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {monitoredItems.length === 0 ? (
            <p className="text-sm text-gray-500">No items being monitored. Start monitoring to see items.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {monitoredItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Buy: {item.purchasePrice} | Sell: {item.resaleValue}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${item.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.profit > 0 ? '+' : ''}{item.profit} ({item.profitPercent.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Purchase History ({history.length})</span>
            {history.length > 0 && (
              <Button
                onClick={handleClearHistory}
                size="sm"
                variant="ghost"
                className="text-red-500"
              >
                Clear
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet. Start monitoring to see logs.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.reverse().map((entry, idx) => (
                <div key={idx} className="text-xs p-2 border rounded bg-gray-50 dark:bg-gray-800">
                  <p className="font-medium">{entry.itemName}</p>
                  <p className="text-gray-500">
                    {entry.action} | {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                  {entry.profit !== undefined && (
                    <p className={entry.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      Profit: {entry.profit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
