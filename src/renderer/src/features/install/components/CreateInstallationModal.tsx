import React, { useState, useEffect } from 'react'
import { HardDrive, Loader2, Box, Laptop, FolderOpen, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/components/UI/dialogs/Dialog'
import CustomDropdown from '@renderer/components/UI/menus/CustomDropdown'
import { BinaryType } from '@renderer/types'
import { getApiType } from '../stores/useInstallationsStore'

interface CreateInstallationModalProps {
  isOpen: boolean
  onClose: () => void
  isMac: boolean
  history: Record<string, string[]>
  isInstalling: boolean
  installProgress: { status: string; percent: number; detail: string }
  onCreate: (name: string, type: BinaryType, version: string, channel: string, customPath?: string) => void
  initialTab?: 'auto' | 'custom'
}

export const CreateInstallationModal: React.FC<CreateInstallationModalProps> = ({
  isOpen,
  onClose,
  isMac,
  history,
  isInstalling,
  installProgress,
  onCreate,
  initialTab = 'auto'
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'custom'>(initialTab)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<BinaryType>(
    isMac ? BinaryType.MacPlayer : BinaryType.WindowsPlayer
  )
  const [newVersion, setNewVersion] = useState('')
  const [newChannel, setNewChannel] = useState('live')
  const [customPath, setCustomPath] = useState('')
  const [freshHistory, setFreshHistory] = useState<Record<string, string[]>>(history)

  const availableVersions = freshHistory[getApiType(newType)] || []

  // Reset form when modal opens and load versions
  useEffect(() => {
    if (isOpen && !isInstalling) {
      setActiveTab(initialTab)
      setNewName('')
      setNewType(isMac ? BinaryType.MacPlayer : BinaryType.WindowsPlayer)
      setNewVersion('')
      setNewChannel('live')
      setCustomPath('');
      // Force fresh deploy history fetch when modal opens (includes macOS versions)
      (async () => {
        try {
          const freshData = await window.api.getDeployHistory(true)
          setFreshHistory(freshData)
        } catch (e) {
          console.error('Failed to load deploy history:', e instanceof Error ? e.message : String(e))
        }
      })()
    }
  }, [isOpen, isMac, isInstalling, initialTab])

  const handleChoosePath = async () => {
    try {
      const path = await window.api.selectInstallationDirectory()
      if (path) {
        setCustomPath(path)
      }
    } catch (error) {
      console.error('Failed to choose installation path:', error instanceof Error ? error.message : String(error))
    }
  }

  const handleClearPath = () => {
    setCustomPath('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      return
    }

    if (activeTab === 'custom') {
      if (!customPath) {
        return
      }
      onCreate(newName, newType, '', '', customPath)
    } else {
      const version = newVersion || availableVersions[0]
      if (!version) {
        return
      }
      // Pass customPath as undefined if not set; onCreate expects optional string or undefined
      onCreate(newName, newType, version, newChannel, customPath || undefined)
    }
  }

  const binaryTypeOptions = isMac
    ? [BinaryType.MacPlayer, BinaryType.MacStudio]
    : [BinaryType.WindowsPlayer, BinaryType.WindowsStudio]

  return (
    <Dialog isOpen={isOpen} onClose={() => !isInstalling && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Installation</DialogTitle>
          {!isInstalling && <DialogClose />}
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 pb-1 block">Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My Custom Version"
                className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 pb-1 block">Type</label>
              <div className="grid grid-cols-2 gap-3">
                {binaryTypeOptions.map((type) => {
                  const isStudio =
                    type === BinaryType.WindowsStudio || type === BinaryType.MacStudio
                  const isSelected = newType === type
                  const selectedClasses = isStudio
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                    : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type)}
                      className={`pressable flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? selectedClasses
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      {isStudio ? <Box size={20} /> : <Laptop size={20} />}
                      <span className="text-sm font-medium">{isStudio ? 'Studio' : 'Player'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Installation Mode Tabs */}
            <div className="pt-2 border-t border-neutral-800">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('auto')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'auto'
                        ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                        : 'bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Auto Install
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'custom'
                        ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                        : 'bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Custom Path
                  </button>
                </div>

              {/* Auto Install Tab */}
              {activeTab === 'auto' && (
                <div className="grid grid-cols-2 gap-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300 pb-1 block">Version</label>
                    {!history || Object.keys(history).length === 0 ? (
                      <div className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-neutral-500 text-sm flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Loading versions...</span>
                      </div>
                    ) : availableVersions.length === 0 ? (
                      <div className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-neutral-500 text-sm flex items-center justify-center">
                        No versions available for this type
                      </div>
                    ) : (
                      <CustomDropdown
                        options={availableVersions.map((v) => ({
                          value: v,
                          label: v,
                          subLabel: v === availableVersions[0] ? '(Latest)' : undefined
                        }))}
                        value={newVersion}
                        onChange={setNewVersion}
                        placeholder="Latest"
                        buttonClassName="bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300 pb-1 block">Channel</label>
                    <input
                      type="text"
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value)}
                      placeholder="live"
                      className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                    />
                  </div>
                </div>
              )}

              {/* Custom Path Tab */}
              {activeTab === 'custom' && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500">Select the path to your existing Roblox installation</p>
                  {!customPath ? (
                    <button
                      type="button"
                      onClick={handleChoosePath}
                      className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors text-sm text-neutral-300 hover:text-white flex items-center justify-center gap-2"
                    >
                      <FolderOpen size={14} />
                      Choose Roblox Installation Folder
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-[var(--color-surface-muted)] border border-neutral-800/50 flex items-center justify-between">
                      <div className="flex-1 text-sm truncate text-neutral-300 flex items-center gap-2">
                        <FolderOpen size={14} className="text-[var(--accent-color)] flex-shrink-0" />
                        <span className="truncate">{customPath}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearPath}
                        className="p-1 ml-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded transition-colors flex-shrink-0"
                        title="Clear selection"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isInstalling ||
                !newName ||
                (activeTab === 'custom'
                  ? !customPath
                  : !history || Object.keys(history).length === 0 || (availableVersions.length === 0 && !newVersion && newChannel !== 'live'))
              }
              className={`pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold rounded-lg transition-all border border-[var(--accent-color-border)] shadow-[0_10px_30px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed ${
                isInstalling ? 'py-4' : 'py-3'
              }`}
            >
              {isInstalling ? (
                <div className="w-full flex flex-col items-center gap-2 px-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>
                      {installProgress.status} ({installProgress.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${installProgress.percent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <HardDrive size={18} />
                  <span>{activeTab === 'custom' ? 'Add Installation' : 'Install'}</span>
                </>
              )}
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
