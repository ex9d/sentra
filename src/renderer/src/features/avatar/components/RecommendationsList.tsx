import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Star, Package } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { RecommendationItem } from '@shared/ipc-schemas/avatar'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@renderer/components/UI/display/Tooltip'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { formatNumber } from '@renderer/utils/numberUtils'
import { useHorizontalScroll } from '@renderer/hooks/useHorizontalScroll'

// Inline RecommendationCard component
const RecommendationCard: React.FC<{
  item: RecommendationItem
  imageUrl?: string
  onClick?: () => void
}> = ({ item, imageUrl, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  const isLimitedItem = item.isLimited || item.isLimitedUnique
  const isLimitedUnique = item.isLimitedUnique
  let displayPrice: string | number = 'Off Sale'

  if (isLimitedItem && item.lowestResalePrice && item.lowestResalePrice > 0) {
    displayPrice = item.lowestResalePrice
  } else if (isLimitedItem && item.lowestPrice && item.lowestPrice > 0) {
    displayPrice = item.lowestPrice
  } else if (item.price !== null && item.price !== undefined) {
    if (item.price === 0 && !isLimitedItem) {
      displayPrice = 'Free'
    } else if (item.price > 0) {
      displayPrice = item.price
    }
  }

  const isOffSale = displayPrice === 'Off Sale'
  const formattedPrice =
    typeof displayPrice === 'number' ? formatNumber(displayPrice) : displayPrice

  return (
    <div
      className="flex-shrink-0 w-[160px] bg-neutral-900/40 border border-neutral-800/50 rounded-xl overflow-hidden cursor-pointer hover:bg-neutral-800/60 hover:border-neutral-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
      onClick={onClick}
    >
      <div className="w-full aspect-square relative overflow-hidden bg-neutral-800/40 p-2">
        <div className="w-full h-full relative overflow-hidden bg-neutral-800/30 rounded-lg">
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
            {isLimitedUnique && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  Limited Unique
                </TooltipContent>
              </Tooltip>
            )}
            {isLimitedItem && !isLimitedUnique && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  Limited
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {imageUrl ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 bg-neutral-700/30 animate-pulse" />}
              <img
                src={imageUrl}
                alt={item.name}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-contain transition-all duration-500 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-700">
              <Package size={28} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-neutral-800/50 bg-neutral-900/30 p-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <h3 className="font-medium text-sm text-neutral-200 truncate">{item.name}</h3>
          </TooltipTrigger>
          <TooltipContent>{item.name}</TooltipContent>
        </Tooltip>

        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-1 font-bold text-sm ${
              isOffSale ? 'text-neutral-500' : 'text-white'
            }`}
          >
            {!isOffSale && displayPrice !== 'Free' && (
              <RobuxIcon className="w-3.5 h-3.5 text-white" />
            )}
            <span className={displayPrice === 'Free' ? 'text-emerald-400' : ''}>
              {formattedPrice}
            </span>
          </div>

          {item.favoriteCount !== undefined && item.favoriteCount > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star size={12} className="text-neutral-600" />
              <span className="text-[10px] font-mono text-neutral-500">
                {formatNumber(item.favoriteCount)}
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-neutral-500 truncate">{item.creatorName}</div>
      </div>
    </div>
  )
}

interface RecommendationsListProps {
  recommendations: RecommendationItem[]
  recommendationThumbnails: Map<number, string>
  onItemClick: (item: RecommendationItem) => void
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  recommendationThumbnails,
  onItemClick
}) => {
  const {
    scrollRef: carouselRef,
    canScrollLeft,
    canScrollRight,
    scroll: scrollCarousel
  } = useHorizontalScroll([recommendations])

  if (recommendations.length === 0) return null

  return (
    <TooltipProvider>
      <div className="pt-6 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Recommended Items</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollCarousel('left')}
              disabled={!canScrollLeft}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                canScrollLeft
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              disabled={!canScrollRight}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                canScrollRight
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-none scroll-smooth py-2 -my-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recommendations.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              imageUrl={recommendationThumbnails.get(item.id)}
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
