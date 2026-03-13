import React, { useState, useCallback } from 'react'
import { cn } from '@renderer/lib/utils'

interface PriceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}

export const PriceInput = ({ value, onChange, placeholder, label, className }: PriceInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  // Update local value when prop changes (e.g., when cleared externally)
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Only allow numbers
    if (newValue === '' || /^\d+$/.test(newValue)) {
      setLocalValue(newValue)
    }
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Only update parent on blur to reduce re-renders and lag
    onChange(localValue)
  }, [localValue, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onChange(localValue)
        e.currentTarget.blur()
      }
    },
    [localValue, onChange]
  )

  const displayValue = localValue || (isFocused ? '' : placeholder)
  const isPlaceholder = !localValue && !isFocused

  return (
    <div className={cn('relative flex-1', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px] font-medium uppercase tracking-wider pointer-events-none z-10">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]',
          'pl-10 pr-3 py-2 font-mono text-sm tracking-tight text-[var(--color-text-primary)] transition-all duration-200',
          'hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isFocused && 'border-[var(--color-border-strong)]',
          isPlaceholder && 'text-[var(--color-text-muted)]'
        )}
      />
    </div>
  )
}
