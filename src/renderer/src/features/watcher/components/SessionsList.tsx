import { X, AlertCircle, RotateCw, XCircle, Lock } from 'lucide-react'
import { WatcherSession } from '../hooks/useWatcher'

interface SessionsListProps {
  sessions: WatcherSession[]
  onRemoveSession: (sessionId: string) => void
  onRelaunchSession: (session: WatcherSession) => void
  onJoinSession?: (session: WatcherSession) => void
  onJoinPrivateServer?: (session: WatcherSession) => void
  onCloseAllSessions?: () => void
}

/**
 * SessionsList - Compact grid showing all active sessions (like Accounts tab)
 */
export default function SessionsList({
  sessions,
  onRemoveSession,
  onRelaunchSession,
  onJoinSession,
  onJoinPrivateServer,
  onCloseAllSessions
}: SessionsListProps) {
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 border-green-500'
      case 'crashed':
        return 'bg-red-500/20 border-red-500'
      case 'restarting':
        return 'bg-yellow-500/20 border-yellow-500'
      default:
        return 'bg-[var(--color-input-bg)] border-[var(--color-border)]'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-400'
      case 'crashed':
        return 'text-red-400'
      case 'restarting':
        return 'text-yellow-400'
      default:
        return 'text-[var(--color-text-muted)]'
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-lg">
        <p className="text-[var(--color-text-muted)]">No active sessions</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header with Close All button */}
      {sessions.length > 0 && onCloseAllSessions && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={onCloseAllSessions}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300"
            title="Close all sessions"
          >
            <XCircle className="w-3 h-3" />
            Close All
          </button>
        </div>
      )}
      {/* Compact Grid */}
      <div className="grid grid-cols-4 gap-2 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`relative p-3 rounded-lg border transition-all ${getStatusBg(
              session.status
            )}`}
          >
            {/* Status indicator dot */}
            <div className="absolute top-2 right-2">
              {session.status === 'running' && (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
              {session.status === 'crashed' && (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
            </div>

            {/* Avatar */}
            {session.avatarUrl && (
              <div className="mb-2 flex justify-center">
                <img
                  src={session.avatarUrl}
                  alt={session.displayName || session.username}
                  className="w-10 h-10 rounded-full border border-[var(--color-border)]"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col gap-1 pr-5">
              {/* Username/DisplayName */}
              <div className="font-medium text-sm truncate text-center">
                {session.displayName || session.username}
              </div>

              {/* Status Badge */}
              <div className={`text-xs font-medium ${getStatusText(session.status)} text-center`}>
                {session.status.toUpperCase()}
              </div>

              {/* Place ID */}
              <div className="text-xs text-[var(--color-text-muted)] font-mono text-center">
                {session.placeId}
              </div>

              {/* Restart count if any */}
              {session.restartCount > 0 && (
                <div className="text-xs text-[var(--color-text-muted)] text-center">
                  Restarted {session.restartCount}x
                </div>
              )}
            </div>

            {/* Remove and Action buttons */}
            <div className="absolute bottom-2 right-2 flex gap-1">
              {session.status === 'running' && onJoinSession && (
                <button
                  onClick={() => onJoinSession(session)}
                  className="px-2 py-1 rounded text-xs font-medium bg-blue-500/30 hover:bg-blue-500/50 border border-blue-500/50 transition-colors text-blue-300 hover:text-blue-200"
                  title="Where to join"
                >
                  Join
                </button>
              )}
              {session.status === 'running' && onJoinPrivateServer && (
                <button
                  onClick={() => onJoinPrivateServer(session)}
                  className="p-1 rounded hover:bg-emerald-500/30 transition-colors text-emerald-400 hover:text-emerald-300"
                  title="Join private server"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
              {session.status === 'crashed' && (
                <button
                  onClick={() => onRelaunchSession(session)}
                  className="p-1 rounded hover:bg-green-500/30 transition-colors text-green-400 hover:text-green-300"
                  title="Relaunch"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => onRemoveSession(session.id)}
                className="p-1 rounded hover:bg-red-500/30 transition-colors text-red-400 hover:text-red-300"
                title="Stop watching"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with stats */}
      <div className="border-t border-[var(--color-border)] mt-2 pt-2 text-xs text-[var(--color-text-muted)]">
        <div className="flex gap-4">
          <span>Total: {sessions.length}</span>
          <span>
            Running: {sessions.filter((s) => s.status === 'running').length}
          </span>
          <span>
            Crashed: {sessions.filter((s) => s.status === 'crashed').length}
          </span>
        </div>
      </div>
    </div>
  )
}
