import { Sparkles, TrendingUp, Flame, Star, Music } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@renderer/components/UI/display/Tooltip'
import { useRolimonsItem } from '@renderer/hooks/queries'

const SOUND_HAT_IDS = [24114402, 305888394, 24112667, 33070696]

interface ItemTagBadgesProps {
  assetId: number
}

export const ItemTagBadges: React.FC<ItemTagBadgesProps> = ({ assetId }) => {
  const rolimonsItem = useRolimonsItem(assetId)
  const isLimited = !!rolimonsItem
  const isSoundHat = SOUND_HAT_IDS.includes(assetId)

  if (!isLimited && !isSoundHat) return null

  return (
    <div className="absolute flex flex-col gap-1.5 z-20 top-2 left-2">
      {isLimited && (
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
      {rolimonsItem?.isProjected && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <TrendingUp size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Projected
          </TooltipContent>
        </Tooltip>
      )}
      {rolimonsItem?.isHyped && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Flame size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Hyped
          </TooltipContent>
        </Tooltip>
      )}
      {rolimonsItem?.isRare && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Star size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Rare
          </TooltipContent>
        </Tooltip>
      )}
      {isSoundHat && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Music size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Sound Hat
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
