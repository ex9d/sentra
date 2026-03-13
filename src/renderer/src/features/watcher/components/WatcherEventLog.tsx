import { RefObject } from 'react'
import { AlertCircle, Info, CheckCircle, RotateCcw } from 'lucide-react'
import { WatcherEvent } from '../hooks/useWatcher'

interface WatcherEventLogProps {
  events: WatcherEvent[]
  endRef?: RefObject<HTMLDivElement | null>
}

/**
 * WatcherEventLog - Displays real-time event log from the watcher
 */
export default function WatcherEventLog({
  events,
  endRef
}: WatcherEventLogProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session-started':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'session-crashed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'session-restarted':
        return <RotateCcw className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Info className="w-4 h-4 text-[var(--color-text-muted)]" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'session-started':
        return 'text-green-500'
      case 'session-crashed':
        return 'text-red-500'
      case 'session-restarted':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-[var(--color-text-muted)]'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-lg">
        <p className="text-[var(--color-text-muted)]">No events yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
      {/* Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {events.map((event, index) => (
          <div
            key={index}
            className="border-b border-[var(--color-border)] px-3 py-2 hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <div className="flex items-start gap-2">
              {getEventIcon(event.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[var(--color-text-muted)]">
                    {formatTime(event.timestamp)}
                  </span>
                  <span className={`font-semibold ${getEventColor(event.type)} uppercase text-xs`}>
                    {event.type.replace(/^session-/, '').replace(/-/g, ' ')}
                  </span>
                </div>
                <div className="text-[var(--color-text-primary)] mt-1 break-words">
                  [{event.username}] {event.message}
                </div>
                {event.details && (
                  <div className="text-[var(--color-text-muted)] mt-1 text-xs">
                    Details: {JSON.stringify(event.details, null, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] px-3 py-2 bg-[var(--color-surface-strong)] text-xs text-[var(--color-text-muted)]">
        {events.length} event{events.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
