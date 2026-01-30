import React, { useState } from 'react'
import {
  Loader2,
  ChevronDown,
  TrendingUp,
  Star,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  Package,
  ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResaleData, AssetOwner } from '@shared/ipc-schemas/avatar'
import { EmptyStateCompact } from '@renderer/components/UI/feedback/EmptyState'
import { ValueChart, PriceChart, CombinedChart } from './EconomyChart'
import { HoardersList, OwnersList } from './UserLists'
import { RolimonsItemPageData } from '@renderer/ipc/windowApi'
import { cn } from '@renderer/lib/utils'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { DEMAND_LABELS, TREND_LABELS, DEMAND_COLORS, TREND_COLORS } from '@renderer/hooks/queries'

interface AssetEconomyTabProps {
  rolimonsItem: any
  resaleData: ResaleData | null
  resaleDataLoading: boolean
  rolimonsPageData: RolimonsItemPageData | null
  rolimonsPageLoading: boolean
  owners: AssetOwner[]
  ownersLoading: boolean
  ownerAvatars: Map<number, string>
  ownerNames: Map<number, string>
  onLoadMoreOwners: () => void
  onOwnerClick?: (userId: string | number, displayName?: string, avatarUrl?: string) => void
}

const TREND_ICONS = {
  0: ArrowDownRight,
  1: Minus,
  2: Minus,
  3: ArrowUpRight
}

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '-'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toLocaleString()
}

// Collapsible Section Component with Animation
const CollapsibleSection: React.FC<{
  title: string
  icon: React.ReactNode
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}> = ({ title, icon, count, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-neutral-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-neutral-900/30 hover:bg-neutral-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{title}</span>
          {count !== undefined && <span className="text-xs text-neutral-500">({count})</span>}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} className="text-neutral-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 bg-neutral-900/20">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const AssetEconomyTab: React.FC<AssetEconomyTabProps> = ({
  rolimonsItem,
  resaleData: _resaleData,
  resaleDataLoading,
  rolimonsPageData,
  rolimonsPageLoading,
  owners,
  ownersLoading,
  ownerAvatars,
  ownerNames,
  onLoadMoreOwners,
  onOwnerClick
}) => {
  const [activeChart, setActiveChart] = useState<'value' | 'price' | 'combined'>('value')
  const isLoading = resaleDataLoading || rolimonsPageLoading

  const itemDetails = rolimonsPageData?.itemDetails
  const TrendIcon = rolimonsItem
    ? TREND_ICONS[rolimonsItem.trend as keyof typeof TREND_ICONS] || Minus
    : Minus

  // Get values from either source
  const value = itemDetails?.value ?? rolimonsItem?.value
  const rap = itemDetails?.rap ?? rolimonsItem?.rap
  const demand = itemDetails?.demand ?? rolimonsItem?.demand
  const trend = itemDetails?.trend ?? rolimonsItem?.trend

  const demandLabel = demand != null ? DEMAND_LABELS[demand] || 'Unknown' : '-'
  const trendLabel = trend != null ? TREND_LABELS[trend] || 'Unknown' : '-'
  const demandColor = demand != null ? DEMAND_COLORS[demand] : 'text-neutral-500'
  const trendColor = trend != null ? TREND_COLORS[trend] : 'text-neutral-500'

  const hasValueChart = rolimonsPageData?.valueChanges && rolimonsPageData.valueChanges.length > 0
  const hasPriceChart =
    rolimonsPageData?.historyData?.rap && rolimonsPageData.historyData.rap.length > 0

  return (
    <div className="space-y-6">
      {/* Header with Loading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Market Data</h2>
          {rolimonsItem && (
            <a
              href={`https://www.rolimons.com/item/${rolimonsItem.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
            >
              Rolimons
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        {isLoading && <Loader2 size={16} className="animate-spin text-emerald-500" />}
      </div>

      {/* Hero Stats: Value & RAP */}
      {(value != null || rap != null) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Value Card */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border border-purple-500/20">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-purple-400/80 text-xs font-medium mb-1">
                <Star size={12} />
                Value
              </div>
              {value != null ? (
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-1.5">
                  {formatNumber(value)}
                  <RobuxIcon className="w-4 h-4" />
                </div>
              ) : (
                <div className="text-lg font-medium text-neutral-500">Not Assigned</div>
              )}
            </div>
          </div>

          {/* RAP Card */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-xl border border-cyan-500/20">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-cyan-400/80 text-xs font-medium mb-1">
                <TrendingUp size={12} />
                RAP
              </div>
              <div className="text-2xl font-bold text-cyan-400 flex items-center gap-1.5">
                {formatNumber(rap)}
                <RobuxIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Indicators: Demand & Trend */}
      {(demand != null || trend != null) && (
        <div className="flex items-center gap-4 p-3 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
          {demand != null && (
            <div className="flex items-center gap-2 flex-1">
              <Flame size={14} className="text-neutral-500" />
              <span className="text-xs text-neutral-500">Demand</span>
              <span className={cn('text-sm font-semibold', demandColor)}>{demandLabel}</span>
              {/* Mini progress indicator */}
              <div className="flex-1 max-w-[60px] h-1 bg-neutral-800 rounded-full overflow-hidden ml-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    demand >= 4
                      ? 'bg-cyan-400'
                      : demand >= 3
                        ? 'bg-emerald-500'
                        : demand >= 2
                          ? 'bg-yellow-500'
                          : demand >= 1
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                  )}
                  style={{ width: `${Math.max(10, (demand + 1) * 20)}%` }}
                />
              </div>
            </div>
          )}
          {demand != null && trend != null && <div className="w-px h-6 bg-neutral-800" />}
          {trend != null && (
            <div className="flex items-center gap-2 flex-1">
              <TrendIcon size={14} className={trendColor} />
              <span className="text-xs text-neutral-500">Trend</span>
              <span className={cn('text-sm font-semibold', trendColor)}>{trendLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart Section with Tabs */}
      {(hasValueChart || hasPriceChart) && (
        <div className="space-y-3">
          {/* Chart Toggle */}
          {(hasValueChart || hasPriceChart) && (
            <div className="flex gap-1 p-1 bg-neutral-900/50 rounded-lg w-fit">
              {hasValueChart && (
                <button
                  onClick={() => setActiveChart('value')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    activeChart === 'value'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  Value History
                </button>
              )}
              {hasPriceChart && (
                <button
                  onClick={() => setActiveChart('price')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    activeChart === 'price'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  RAP History
                </button>
              )}
              {hasValueChart && hasPriceChart && (
                <button
                  onClick={() => setActiveChart('combined')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    activeChart === 'combined'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  Combined
                </button>
              )}
            </div>
          )}

          {/* Active Chart */}
          {activeChart === 'value' && hasValueChart ? (
            <ValueChart
              valueChanges={rolimonsPageData!.valueChanges}
              demand={demand}
              trend={trend}
            />
          ) : activeChart === 'price' && hasPriceChart ? (
            <PriceChart historyData={rolimonsPageData!.historyData} demand={demand} trend={trend} />
          ) : activeChart === 'combined' && hasValueChart && hasPriceChart ? (
            <CombinedChart
              valueChanges={rolimonsPageData!.valueChanges}
              historyData={rolimonsPageData?.historyData}
            />
          ) : hasValueChart ? (
            <ValueChart
              valueChanges={rolimonsPageData!.valueChanges}
              demand={demand}
              trend={trend}
            />
          ) : hasPriceChart ? (
            <PriceChart historyData={rolimonsPageData!.historyData} demand={demand} trend={trend} />
          ) : null}
        </div>
      )}

      {/* Analytics Section */}
      <div className="space-y-3">
        {/* Ownership Stats */}
        {itemDetails && (itemDetails.owners || itemDetails.copies) && (
          <CollapsibleSection
            title="Ownership Stats"
            icon={<Users size={14} className="text-neutral-400" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-3 gap-3 pt-4">
              {itemDetails.owners != null && (
                <div className="text-center p-3 bg-neutral-800/30 rounded-lg">
                  <div className="text-xl font-bold text-white">
                    {formatNumber(itemDetails.owners)}
                  </div>
                  <div className="text-xs text-neutral-400">Available Copies</div>
                </div>
              )}
              {itemDetails.bc_owners != null && (
                <div className="text-center p-3 bg-neutral-800/30 rounded-lg">
                  <div className="text-xl font-bold text-blue-400">
                    {formatNumber(itemDetails.bc_owners)}
                  </div>
                  <div className="text-xs text-neutral-400">Premium Copies</div>
                </div>
              )}
              {itemDetails.copies != null && (
                <div className="text-center p-3 bg-neutral-800/30 rounded-lg">
                  <div className="text-xl font-bold text-neutral-300">
                    {formatNumber(itemDetails.copies)}
                  </div>
                  <div className="text-xs text-neutral-400">Total Copies</div>
                </div>
              )}
              {itemDetails.deleted_copies != null && itemDetails.deleted_copies > 0 && (
                <div className="text-center p-3 bg-neutral-800/30 rounded-lg">
                  <div className="text-xl font-bold text-red-400">
                    {formatNumber(itemDetails.deleted_copies)}
                  </div>
                  <div className="text-xs text-neutral-400">Deleted</div>
                </div>
              )}
              {itemDetails.hoarded_copies != null && itemDetails.hoarded_copies > 0 && (
                <div className="text-center p-3 bg-neutral-800/30 rounded-lg">
                  <div className="text-xl font-bold text-amber-400">
                    {formatNumber(itemDetails.hoarded_copies)}
                  </div>
                  <div className="text-xs text-neutral-400">Hoarded</div>
                </div>
              )}
              {itemDetails.num_sellers != null && (
                <div className="text-center p-3 bg-neutral-800/30 rounded-lg">
                  <div className="text-xl font-bold text-emerald-400">
                    {formatNumber(itemDetails.num_sellers)}
                  </div>
                  <div className="text-xs text-neutral-400">Sellers</div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Hoarders - Collapsible */}
        {rolimonsPageData?.hoardsData &&
          rolimonsPageData.hoardsData.owner_names &&
          rolimonsPageData.hoardsData.owner_names.length > 0 && (
            <CollapsibleSection
              title="Top Hoarders"
              icon={<Package size={14} className="text-neutral-400" />}
              count={rolimonsPageData.hoardsData.owner_names.length}
              defaultOpen={false}
            >
              <div className="pt-4">
                <HoardersList
                  hoardsData={rolimonsPageData.hoardsData}
                  onOwnerClick={onOwnerClick}
                />
              </div>
            </CollapsibleSection>
          )}

        {/* Owners - Collapsible */}
        {owners.length > 0 && (
          <CollapsibleSection
            title="Recent Owners"
            icon={<Users size={14} className="text-neutral-400" />}
            count={owners.length}
            defaultOpen={false}
          >
            <div className="pt-4 -mx-4">
              <OwnersList
                owners={owners}
                ownersLoading={ownersLoading}
                ownerAvatars={ownerAvatars}
                ownerNames={ownerNames}
                onLoadMore={onLoadMoreOwners}
                onOwnerClick={onOwnerClick}
              />
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && !rolimonsItem && !itemDetails && (
        <EmptyStateCompact message="No market data available for this item" className="py-8" />
      )}
    </div>
  )
}
