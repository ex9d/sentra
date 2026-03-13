import { Play, Square } from 'lucide-react'

interface WatcherControlsProps {
  isWatching: boolean
  onToggle: () => void
  sessionCount: number
}

/**
 * WatcherControls - Button controls for starting/stopping the watcher
 */
export default function WatcherControls({
  isWatching,
  onToggle,
  sessionCount
}: WatcherControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isWatching
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isWatching ? (
          <>
            <Square className="w-4 h-4" />
            Stop Watching
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Start Watching
          </>
        )}
      </button>

      <div className="text-sm text-[var(--color-text-muted)]">
        {isWatching && sessionCount > 0 && (
          <p>Monitoring {sessionCount} session{sessionCount !== 1 ? 's' : ''}</p>
        )}
        {isWatching && sessionCount === 0 && (
          <p className="text-yellow-500">Watching active, but no sessions yet</p>
        )}
        {!isWatching && (
          <p>Watcher is inactive</p>
        )}
      </div>
    </div>
  )
}
