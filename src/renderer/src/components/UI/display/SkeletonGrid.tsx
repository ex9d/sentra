import React from 'react'
import { cn } from '../../../lib/utils'
import {
  SkeletonUserCard,
  SkeletonFriendCard,
  SkeletonGameCard,
  SkeletonSquareCard,
  SkeletonGroupCard,
  SkeletonInventoryCard
} from './SkeletonCard'





interface SkeletonGridProps {
  count?: number
  className?: string
  gridClassName?: string
}




export const SkeletonFriendGrid: React.FC<SkeletonGridProps> = ({
  count = 12,
  className,
  gridClassName
}) => (
  <div className={cn('space-y-6', className)}>
    <div className={cn('grid grid-cols-2 gap-3', gridClassName)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFriendCard key={i} />
      ))}
    </div>
  </div>
)




export const SkeletonGameGrid: React.FC<
  SkeletonGridProps & {
    gridStyle?: React.CSSProperties
  }
> = ({ count = 15, className, gridStyle }) => {
  return (
    <div className={cn('grid gap-6', className)} style={gridStyle}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGameCard key={i} />
      ))}
    </div>
  )
}




export const SkeletonSquareGrid: React.FC<
  SkeletonGridProps & {
    columns?: string
  }
> = ({ count = 10, className, columns = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' }) => {
  return (
    <div className={cn('grid', columns, 'gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSquareCard key={i} />
      ))}
    </div>
  )
}




export const SkeletonUserRow: React.FC<
  SkeletonGridProps & {
    variant?: 'friend' | 'group'
  }
> = ({ count = 5, className, variant = 'friend' }) => (
  <div className={cn('flex gap-4 overflow-hidden', className)}>
    {Array.from({ length: count }).map((_, i) =>
      variant === 'group' ? (
        <SkeletonGroupCard key={i} />
      ) : (
        <SkeletonUserCard key={i} variant="vertical" showBorder={false} />
      )
    )}
  </div>
)




export const SkeletonInventoryGrid: React.FC<
  SkeletonGridProps & {
    columns?: string
  }
> = ({ count = 12, className, columns = 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6' }) => (
  <div className={cn('grid gap-2', columns, className)}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonInventoryCard key={i} />
    ))}
  </div>
)




export const SkeletonUserList: React.FC<SkeletonGridProps> = ({ count = 8, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonUserCard key={i} showBorder={false} />
    ))}
  </div>
)

export default {
  SkeletonFriendGrid,
  SkeletonGameGrid,
  SkeletonSquareGrid,
  SkeletonUserRow,
  SkeletonInventoryGrid,
  SkeletonUserList
}