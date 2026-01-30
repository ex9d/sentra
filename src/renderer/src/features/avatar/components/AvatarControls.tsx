import React from 'react'
import { RotateCcw, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'

interface AvatarControlsProps {
  onRefresh: () => void
  onReset: () => void
  isRendering: boolean
}

export const AvatarControls: React.FC<AvatarControlsProps> = ({
  onRefresh,
  onReset,
  isRendering
}) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            onClick={onRefresh}
            disabled={isRendering}
            className="bg-[var(--color-surface-muted)]/70 backdrop-blur hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
          >
            <RefreshCw size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh Render</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            onClick={onReset}
            className="bg-[var(--color-surface-muted)]/70 backdrop-blur hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
          >
            <RotateCcw size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset Camera</TooltipContent>
      </Tooltip>
    </div>
  )
}
