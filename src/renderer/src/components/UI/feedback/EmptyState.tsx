import React from 'react'
import { cn } from '@renderer/lib/utils'

type EmptyStateVariant = 'default' | 'dashed' | 'minimal'

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  variant?: EmptyStateVariant
  className?: string
}

const variantStyles: Record<EmptyStateVariant, string> = {
  default: 'p-8 text-center',
  dashed: 'p-4 text-center bg-neutral-900/30 rounded-xl border border-neutral-800 border-dashed',
  minimal: 'py-8 text-center'
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-neutral-600',
        variantStyles[variant],
        className
      )}
    >
      {Icon && (
        <div className="p-8 bg-neutral-900/60 rounded-full border border-neutral-800">
          <Icon size={36} className="text-neutral-500" />
        </div>
      )}
      <div className="text-center max-w-sm">
        <p className="text-lg font-medium text-neutral-400">{title}</p>
        {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/**
 * Compact empty state for inline use (e.g., within sections)
 */
export const EmptyStateCompact: React.FC<{
  message: string
  className?: string
}> = ({ message, className }) => (
  <div
    className={cn(
      'p-4 text-center text-neutral-500 text-sm bg-neutral-900/30 rounded-xl border border-neutral-800 border-dashed',
      className
    )}
  >
    {message}
  </div>
)

export default EmptyState
