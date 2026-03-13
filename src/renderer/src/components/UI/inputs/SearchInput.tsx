import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@renderer/components/UI/inputs/Input'
import { cn } from '@renderer/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  containerClassName?: string
  showClearButton?: boolean
  onClear?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  containerClassName,
  showClearButton = true,
  onClear,
  onKeyDown,
  onFocus
}) => {
  const handleClear = () => {
    onChange('')
    onClear?.()
  }

  return (
    <div className={cn('relative', containerClassName)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-neutral-500" />
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={cn('pl-10', showClearButton && value && 'pr-10', className)}
      />
      {showClearButton && value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
