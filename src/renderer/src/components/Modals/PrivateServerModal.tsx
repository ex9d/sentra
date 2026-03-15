import React, { useState } from 'react'
import { X, Lock, Link2, Play } from 'lucide-react'
import { Dialog, DialogContent } from '../UI/dialogs/Dialog'

export interface PrivateServerModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (link: string, serverName?: string) => void
  isLoading?: boolean
  sessionUsername?: string
}

const PrivateServerModal: React.FC<PrivateServerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  sessionUsername = 'Session'
}) => {
  const [link, setLink] = useState('')
  const [serverName, setServerName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (link.trim()) {
      onSubmit(link.trim(), serverName.trim() || undefined)
      setLink('')
      setServerName('')
    }
  }

  const handleClose = () => {
    setLink('')
    setServerName('')
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogContent className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-surface-hover)] rounded-lg">
              <Lock className="text-[var(--color-text-primary)]" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Join Private Server</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{sessionUsername}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] rounded transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Server Link Input */}
          <div className="space-y-2">
            <label htmlFor="linkInput" className="block text-base font-medium text-[var(--color-text-primary)]">
              <div className="flex items-center gap-2">
                <Link2 size={16} />
                <span>Server Link</span>
              </div>
            </label>
            <input
              id="linkInput"
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g. https://www.roblox.com/games/..."
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent transition-all"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-[var(--color-text-muted)]">Paste the private server link here</p>
          </div>

          {/* Server Name Input (Optional) */}
          <div className="space-y-2">
            <label htmlFor="serverNameInput" className="block text-base font-medium text-[var(--color-text-primary)] pb-0">
              Server Name <span className="text-[var(--color-text-muted)] text-xs font-normal">(optional)</span>
            </label>
            <input
              id="serverNameInput"
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="e.g. Trading Server"
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium py-3 rounded border border-[var(--color-border)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!link.trim() || isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] text-md font-bold py-3 rounded shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} fill="currentColor" />
              <span>{isLoading ? 'Joining...' : 'Join Server'}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PrivateServerModal

