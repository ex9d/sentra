import { X } from 'lucide-react'
import { useMemo } from 'react'

interface Account {
  id: string
  username: string
  displayName?: string
  userId: string
  avatarUrl?: string
  importedVia?: 'browser' | 'cookie' | 'cookielist'
}

interface AccountSelectionModalProps {
  accounts: Account[]
  selectedAccountIds: Set<string>
  onToggleAccount: (accountId: string) => void
  onSelectAll: () => void
  onClose: () => void
}

export default function AccountSelectionModal({
  accounts,
  selectedAccountIds,
  onToggleAccount,
  onSelectAll,
  onClose
}: AccountSelectionModalProps) {
  const selectedCount = selectedAccountIds.size
  const allSelected = selectedCount === accounts.length

  const getImportMethodDescription = (importedVia?: string): string => {
    switch (importedVia) {
      case 'browser':
        return 'Browser login'
      case 'cookie':
        return 'Single cookie'
      case 'cookielist':
        return 'Cookie list'
      default:
        return 'Unknown'
    }
  }

  const accountsGrid = useMemo(() => {
    return accounts.map((account) => (
      <button
        key={account.id}
        onClick={() => onToggleAccount(account.id)}
        className={`p-4 rounded-lg border-2 transition-all text-center ${
          selectedAccountIds.has(account.id)
            ? 'bg-blue-600/20 border-blue-500'
            : 'bg-[var(--color-input-bg)] border-[var(--color-border)] hover:border-blue-500'
        }`}
      >
        {account.avatarUrl && (
          <div className="mb-3 flex justify-center">
            <img
              src={account.avatarUrl}
              alt={account.displayName || account.username}
              className="w-16 h-16 rounded-full border border-[var(--color-border)]"
            />
          </div>
        )}
        <div className="font-medium text-sm mb-1">{account.displayName || account.username}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{account.username}</div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1.5">
          {getImportMethodDescription(account.importedVia)}
        </div>
        {selectedAccountIds.has(account.id) && (
          <div className="text-blue-400 text-sm mt-2">✓ Selected</div>
        )}
      </button>
    ))
  }, [accounts, selectedAccountIds, onToggleAccount])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] w-[90%] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-xl font-bold">Select Accounts</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {selectedCount === 0
                ? 'No accounts selected'
                : `${selectedCount} account${selectedCount === 1 ? '' : 's'} selected`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-[var(--color-border)] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Select All Button */}
        <div className="px-6 pt-4 pb-2">
        </div>

        {/* Accounts Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            {accountsGrid}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={selectedCount === 0}
            className="px-6 py-2 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] disabled:bg-gray-600 disabled:opacity-50 text-[var(--accent-color-foreground)] font-medium transition-colors"
          >
            Continue ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  )
}
