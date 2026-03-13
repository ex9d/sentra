import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CatalogActiveFiltersProps {
  filters: {
    minPrice?: number
    maxPrice?: number
    creatorName?: string
    salesType?: string // '1' | '2' | '3'
    unavailableItems?: string
    categoryName?: string
  }
  onClearFilter: (key: string) => void
  onClearAll: () => void
}

export const CatalogActiveFilters = ({
  filters,
  onClearFilter,
  onClearAll
}: CatalogActiveFiltersProps) => {
  const activeFilters: { key: string; label: string; value: string }[] = []

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice !== undefined ? filters.minPrice : '0'
    const max = filters.maxPrice !== undefined ? filters.maxPrice : '∞'
    activeFilters.push({ key: 'price', label: 'Price', value: `${min} - ${max}` })
  }

  if (filters.creatorName) {
    activeFilters.push({ key: 'creator', label: 'Creator', value: filters.creatorName })
  }

  if (filters.salesType && filters.salesType !== '1') {
    const label = filters.salesType === '2' ? 'Collectibles' : 'Limiteds'
    activeFilters.push({ key: 'salesType', label: 'Type', value: label })
  }

  if (filters.unavailableItems === 'show') {
    activeFilters.push({ key: 'unavailable', label: 'Unavailable', value: 'Shown' })
  }

  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-neutral-800 bg-neutral-900/20">
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mr-2">
        Active Filters:
      </span>
      <AnimatePresence>
        {activeFilters.map((filter) => (
          <motion.div
            key={filter.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border-strong)] text-xs text-[var(--color-text-primary)] group shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
          >
            <span className="font-medium text-[var(--color-text-secondary)]">{filter.label}:</span>
            <span className="text-[var(--color-text-primary)]">{filter.value}</span>
            <button
              onClick={() => onClearFilter(filter.key)}
              className="p-0.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition-colors ml-0.5"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-neutral-500 hover:text-neutral-300 underline decoration-neutral-700 underline-offset-2 ml-2 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
