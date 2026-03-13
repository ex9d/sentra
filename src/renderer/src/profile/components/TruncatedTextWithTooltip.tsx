import React, { useRef, useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'

interface TruncatedTextWithTooltipProps {
  text: string
  className?: string
}

export const TruncatedTextWithTooltip: React.FC<TruncatedTextWithTooltipProps> = ({
  text,
  className
}) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const checkTruncation = () => {
      const node = textRef.current
      if (!node) return
      const truncated =
        node.scrollHeight - node.clientHeight > 1 || node.scrollWidth - node.clientWidth > 1
      setIsTruncated(truncated)
    }

    checkTruncation()

    let resizeObserver: ResizeObserver | null = null

    // ResizeObserver is well-supported in modern browsers and Electron environments
    resizeObserver = new ResizeObserver(() => checkTruncation())
    resizeObserver.observe(element)

    return () => {
      resizeObserver?.disconnect()
    }
  }, [text])

  const content = (
    <div ref={textRef} className={className}>
      {text}
    </div>
  )

  if (!isTruncated) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
