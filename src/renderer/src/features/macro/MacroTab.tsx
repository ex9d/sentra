import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/UI/display/Card'
import { Play, Trash2, List, RotateCw, Zap } from 'lucide-react'

interface MacroEvent {
  type: 'mousemove' | 'click' | 'keypress'
  x?: number
  y?: number
  button?: 'left' | 'right' | 'middle'
  key?: string
  delay?: number
}

interface Macro {
  id: string
  name: string
  description?: string
  events: MacroEvent[]
  createdAt: number
  updatedAt: number
  timing: {
    totalDuration: number
    eventCount: number
  }
}

// Built-in macro names for quick lookup (matches MacroService definition)
const BUILT_IN_NAMES = new Set(['Jump', 'Move Forward', 'Move Back', 'Move Left', 'Move Right', 'Sprint', 'Crouch', 'Emote Dance 1'])

const MACRO_CATEGORIES: Record<string, string> = {
  'Jump': 'Actions',
  'Sprint': 'Actions',
  'Crouch': 'Actions',
  'Move Forward': 'Movement',
  'Move Back': 'Movement',
  'Move Left': 'Movement',
  'Move Right': 'Movement',
  'Emote Dance 1': 'Emotes'
}

interface MacroCardProps {
  macro: Macro
  isBuiltIn: boolean
  onPlay: (macroId: string) => void
  onDelete: (macroId: string) => void
}

const MacroCard = React.memo(({ macro, isBuiltIn, onPlay, onDelete }: MacroCardProps) => (
  <div 
    className={`p-4 border rounded-lg transition-all hover:shadow-md ${
      isBuiltIn
        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700'
        : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-base">{macro.name}</p>
          {isBuiltIn && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-300 to-orange-300 dark:from-amber-600 dark:to-orange-600 text-amber-900 dark:text-amber-50 text-xs font-bold rounded-full shadow-sm">
              <Zap className="w-3 h-3" />
              Built-in
            </span>
          )}
        </div>
        {macro.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{macro.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {macro.timing.eventCount} events
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {(macro.timing.totalDuration / 1000).toFixed(2)}s
          </span>
          {isBuiltIn && (
            <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {MACRO_CATEGORIES[macro.name] || 'Other'}
            </span>
          )}
        </div>
      </div>
    </div>
    
    <div className="flex gap-2 pt-2">
      <Button
        onClick={() => onPlay(macro.id)}
        size="sm"
        variant={isBuiltIn ? 'default' : 'outline'}
        className="flex items-center gap-1 flex-1"
      >
        <Play className="w-4 h-4" />
        Play
      </Button>
      {!isBuiltIn && (
        <Button
          onClick={() => onDelete(macro.id)}
          size="sm"
          variant="ghost"
          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Delete macro"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  </div>
))

MacroCard.displayName = 'MacroCard'

export const MacroTab = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [macros, setMacros] = useState<Macro[]>([])
  const [recordingProgress, setRecordingProgress] = useState({ eventCount: 0, duration: 0 })
  const [macroName, setMacroName] = useState('')
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load macros once on mount
  useEffect(() => {
    const loadMacros = async () => {
      try {
        setError(null)
        const result = await window.api.macro.listMacros()
        if (result.success) {
          setMacros(result.macros || [])
        } else {
          setError('Failed to load macros')
        }
      } catch (err) {
        setError(String(err))
        console.error('Failed to load macros:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadMacros()
  }, [])

  // Polling for recording status (optimized interval)
  useEffect(() => {
    const checkRecording = async () => {
      try {
        const result = await window.api.macro.isRecording()
        setIsRecording(result.isRecording)
      } catch (err) {
        console.error('Failed to check recording status:', err)
      }
    }

    const interval = setInterval(checkRecording, 500)
    return () => clearInterval(interval)
  }, [])

  // Polling for recording progress (only when recording)
  useEffect(() => {
    if (!isRecording) return

    const getProgress = async () => {
      try {
        const progress = await window.api.macro.getRecordingProgress()
        setRecordingProgress({ eventCount: progress.eventCount, duration: progress.duration })
      } catch (err) {
        console.error('Failed to get recording progress:', err)
      }
    }

    const interval = setInterval(getProgress, 200)
    return () => clearInterval(interval)
  }, [isRecording])

  // Helper function to refetch macros - ensures UI state matches filesystem
  const refetchMacros = useCallback(async () => {
    try {
      const result = await window.api.macro.listMacros()
      if (result.success) {
        setMacros(result.macros || [])
      }
    } catch (err) {
      console.error('Failed to refetch macros:', err)
    }
  }, [])

  // Memoized handlers
  const handleStartRecording = useCallback(async () => {
    try {
      await window.api.macro.startRecording()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Failed to start recording')
    }
  }, [])

  const handleStopRecording = useCallback(async () => {
    try {
      const result = await window.api.macro.stopRecording()
      setIsRecording(false)

      if (!result.events || result.events.length === 0) {
        setError('No events recorded. Try recording again.')
        setRecordingProgress({ eventCount: 0, duration: 0 })
        return
      }

      const name = macroName || `Macro_${new Date().toLocaleTimeString()}`
      const saveResult = await window.api.macro.saveMacro(name, result.events)

      if (saveResult.success) {
        // Refetch macros to verify save and ensure state consistency
        await refetchMacros()
        setMacroName('')
        setRecordingProgress({ eventCount: 0, duration: 0 })
        setError(null)
      } else {
        setError('Failed to save macro')
        setRecordingProgress({ eventCount: 0, duration: 0 })
      }
    } catch (err) {
      console.error('Failed to stop recording:', err)
      setError('Failed to stop recording')
      setRecordingProgress({ eventCount: 0, duration: 0 })
    }
  }, [macroName, refetchMacros])

  const handlePlayMacro = useCallback(async (macroId: string) => {
    try {
      const result = await window.api.macro.playMacro(macroId, playbackSpeed)
      if (!result.success) {
        setError(result.error || 'Failed to play macro')
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('Failed to play macro:', err)
      setError('Failed to play macro')
    }
  }, [playbackSpeed])

  const handleDeleteMacro = useCallback(async (macroId: string) => {
    try {
      const result = await window.api.macro.deleteMacro(macroId)
      if (result.success) {
        // Refetch macros to verify delete and ensure state consistency
        await refetchMacros()
        setError(null)
      } else {
        setError('Failed to delete macro')
      }
    } catch (err) {
      console.error('Failed to delete macro:', err)
      setError('Failed to delete macro')
    }
  }, [refetchMacros])

  // Memoized sorting and filtering
  const { builtInMacros, customMacros } = useMemo(() => {
    const built = macros.filter(m => BUILT_IN_NAMES.has(m.name))
    const custom = macros.filter(m => !BUILT_IN_NAMES.has(m.name))
    
    // Sort built-in macros by category order
    const categoryOrder = { 'Movement': 0, 'Actions': 1, 'Emotes': 2 }
    built.sort((a, b) => {
      const catA = MACRO_CATEGORIES[a.name] || 'Other'
      const catB = MACRO_CATEGORIES[b.name] || 'Other'
      return (categoryOrder[catA as keyof typeof categoryOrder] ?? 3) - (categoryOrder[catB as keyof typeof categoryOrder] ?? 3)
    })
    
    return { builtInMacros: built, customMacros: custom }
  }, [macros])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading macros...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6 max-w-full">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}

        {/* Recording Section */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCw className="w-5 h-5" />
            Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleStartRecording}
              disabled={isRecording}
              variant={isRecording ? 'outline' : 'default'}
              className="flex-1"
            >
              Start Recording
            </Button>
            <Button
              onClick={handleStopRecording}
              disabled={!isRecording}
              variant={isRecording ? 'destructive' : 'outline'}
              className="flex-1"
            >
              Stop Recording
            </Button>
          </div>

          {isRecording && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">Recording in Progress</p>
              <p className="text-xs text-blue-600 dark:text-blue-300 font-mono">
                {recordingProgress.eventCount} events • {(recordingProgress.duration / 1000).toFixed(1)}s
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Macro Name (optional)</label>
            <input
              type="text"
              value={macroName}
              onChange={(e) => setMacroName(e.target.value)}
              placeholder="Enter macro name..."
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* Playback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Playback Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Speed: {playbackSpeed.toFixed(2)}x</label>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.25"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>0.25x (Slow)</span>
              <span>1x (Normal)</span>
              <span>3x (Fast)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Built-in Macros Section */}
      {builtInMacros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Built-in Macros ({builtInMacros.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Ready-to-use macros for common Roblox actions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builtInMacros.map(macro => (
                <MacroCard
                  key={macro.id}
                  macro={macro}
                  isBuiltIn={true}
                  onPlay={handlePlayMacro}
                  onDelete={handleDeleteMacro}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Macros Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            Custom Macros ({customMacros.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customMacros.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No custom macros recorded yet. Use the Recording section to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {customMacros.map(macro => (
                <MacroCard
                  key={macro.id}
                  macro={macro}
                  isBuiltIn={false}
                  onPlay={handlePlayMacro}
                  onDelete={handleDeleteMacro}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
