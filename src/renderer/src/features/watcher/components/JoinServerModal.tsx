import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/components/UI/dialogs/Dialog'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Loader2 } from 'lucide-react'

interface JoinServerModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinPublic: () => Promise<void>
  onJoinPrivate: (jobId: string) => Promise<void>
  onJoinPrivateLink: (linkCode: string) => Promise<void>
  sessionUsername: string
  isLoading: boolean
}

/**
 * JoinServerModal - Modal for choosing where to join (public, private server with Job ID, or private server with link code)
 */
export const JoinServerModal: React.FC<JoinServerModalProps> = ({
  isOpen,
  onClose,
  onJoinPublic,
  onJoinPrivate,
  onJoinPrivateLink,
  sessionUsername,
  isLoading
}) => {
  const [joinMode, setJoinMode] = useState<'public' | 'private-jobid' | 'private-link'>('public')
  const [jobId, setJobId] = useState('')
  const [privateServerLink, setPrivateServerLink] = useState('')
  const [serverName, setServerName] = useState('')

  const handleJoin = async () => {
    if (joinMode === 'public') {
      await onJoinPublic()
    } else if (joinMode === 'private-jobid') {
      if (!jobId.trim()) {
        alert('Please enter a Job ID')
        return
      }
      await onJoinPrivate(jobId.trim())
    } else {
      if (!privateServerLink.trim()) {
        alert('Please enter a private server link or invite URL')
        return
      }
      await onJoinPrivateLink(privateServerLink.trim())
    }
    // Close modal after successful join
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join Server - {sessionUsername}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Joining Mode</label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setJoinMode('public')
                    setJobId('')
                    setPrivateServerLink('')
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all text-left ${
                    joinMode === 'public'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="font-medium text-sm">Public Server</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    Join any public server
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setJoinMode('private-jobid')}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all text-left ${
                    joinMode === 'private-jobid'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="font-medium text-sm">Private Server (Job ID)</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    Join with Job ID or access code
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setJoinMode('private-link')}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-all text-left ${
                    joinMode === 'private-link'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="font-medium text-sm">Private Server (Link)</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    Join with invite link or link code
                  </div>
                </button>
              </div>
            </div>

            {/* Job ID Input */}
            {joinMode === 'private-jobid' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job ID or Access Code</label>
                  <input
                    type="text"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    placeholder="e.g. 12345678-1234-1234-1234-123456789012"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    The Job ID or access code of the private server
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Server Nickname (Optional)</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="e.g. My Private Server"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Name this server for easy reference
                  </p>
                </div>
              </div>
            )}

            {/* Private Server Link Input */}
            {joinMode === 'private-link' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Private Server Link or Invite URL</label>
                  <input
                    type="text"
                    value={privateServerLink}
                    onChange={(e) => setPrivateServerLink(e.target.value)}
                    placeholder="e.g. https://www.roblox.com/games/123456?privateServerLinkCode=abc123 or just the link code"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Paste the full invite URL or just the private server link code
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Server Nickname (Optional)</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="e.g. My Private Server"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm placeholder-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Name this server for easy reference
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleJoin}
                disabled={
                  isLoading ||
                  (joinMode === 'private-jobid' && !jobId.trim()) ||
                  (joinMode === 'private-link' && !privateServerLink.trim())
                }
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  'Join'
                )}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
