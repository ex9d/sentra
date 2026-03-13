import React, { useState, useEffect } from 'react'
import { X, Save, Shirt } from 'lucide-react'
import { Dialog, DialogContent } from '@renderer/components/UI/dialogs/Dialog'

interface RenameOutfitModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (outfitId: number, newName: string) => void
  outfitId: number | null
  currentName: string
}

const RenameOutfitModal: React.FC<RenameOutfitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  outfitId,
  currentName
}) => {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen && outfitId) {
      setName(currentName)
    }
  }, [isOpen, outfitId, currentName])

  if (!outfitId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(outfitId, name)
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-[var(--accent-color-ring)]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Shirt className="text-neutral-300" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Rename Outfit</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pressable p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="nameInput" className="text-sm font-medium text-neutral-400">
              Outfit Name
            </label>
            <input
              id="nameInput"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Cool Outfit"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all"
              autoFocus
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pressable flex-[2] flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)]"
            >
              <Save size={18} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RenameOutfitModal
