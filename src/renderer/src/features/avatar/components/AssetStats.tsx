import React from 'react'
import { Heart, Tag, Calendar, Sparkles, TrendingUp, Clock, LucideIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { AssetDetails } from '@shared/ipc-schemas/avatar'
import { SalesItem } from '@renderer/utils/salesData'
import { formatDate, formatDateTime } from '@renderer/utils/dateUtils'
import { ASSET_TYPE_NAMES } from '../utils/categoryUtils'
import { cn } from '@renderer/lib/utils'

interface PrimaryStat {
  icon: LucideIcon
  label: string
  value: string
  color: 'emerald' | 'rose' | 'amber'
}

interface AssetStatsProps {
  details: AssetDetails
  salesData: SalesItem | null
}

export const AssetStats: React.FC<AssetStatsProps> = ({ details, salesData }) => {
  // Resolve asset type name
  const assetTypeId = details.AssetTypeId || details.assetType
  const assetTypeName = assetTypeId ? ASSET_TYPE_NAMES[assetTypeId] : details.itemType

  const isLimited = details.isLimited || details.isLimitedUnique

  // Collect all stats into arrays for better layout control
  const primaryStats: PrimaryStat[] = []

  // Primary stats (always shown, highlighted)
  if (salesData) {
    primaryStats.push({
      icon: TrendingUp,
      label: 'Sales',
      value: salesData.sales.toLocaleString(),
      color: 'emerald'
    })
  } else if (details.sales !== undefined && details.sales > 0) {
    primaryStats.push({
      icon: TrendingUp,
      label: 'Sales',
      value: details.sales.toLocaleString(),
      color: 'emerald'
    })
  }

  primaryStats.push({
    icon: Heart,
    label: 'Favorites',
    value: details.favoriteCount?.toLocaleString() ?? '0',
    color: 'rose'
  })

  // Limited stock
  if (isLimited && details.totalQuantity !== undefined && (details.remaining ?? 0) > 1) {
    primaryStats.push({
      icon: Sparkles,
      label: 'Stock',
      value: `${(details.remaining ?? 0).toLocaleString()} / ${details.totalQuantity.toLocaleString()}`,
      color: 'amber'
    })
  }

  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white">Statistics</h3>

      {/* Primary Stats */}
      <div className={cn('grid gap-3', primaryStats.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {primaryStats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border ${colorClasses[stat.color as keyof typeof colorClasses]} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className="opacity-80" />
              <span className="text-xs font-medium opacity-80">{stat.label}</span>
            </div>
            <div className="text-xl font-bold tracking-tight">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Metadata Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
          <Tag size={12} className="text-neutral-500" />
          <span className="text-xs text-neutral-500">Type</span>
          <span className="text-sm font-medium text-neutral-200">
            {assetTypeName || details.itemType || 'Asset'}
          </span>
        </div>

        {/* Non-limited remaining */}
        {!isLimited && details.remaining !== undefined && details.remaining > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
            <Tag size={12} className="text-neutral-500" />
            <span className="text-xs text-neutral-500">Remaining</span>
            <span className="text-sm font-medium text-neutral-200">
              {details.remaining.toLocaleString()}
            </span>
          </div>
        )}

        {/* Date stats */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-800/50 cursor-default">
              <Calendar size={12} className="text-neutral-500" />
              <span className="text-xs text-neutral-500">Created</span>
              <span className="text-sm font-medium text-neutral-200">
                {formatDate(details.created)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(details.created)}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-800/50 cursor-default">
              <Clock size={12} className="text-neutral-500" />
              <span className="text-xs text-neutral-500">Updated</span>
              <span className="text-sm font-medium text-neutral-200">
                {formatDate(details.updated)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(details.updated)}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
