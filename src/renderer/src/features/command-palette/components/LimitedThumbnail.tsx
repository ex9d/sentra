import React, { useState, useEffect, useRef, memo } from 'react'
import { Boxes } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { thumbnailLoader } from '../utils/thumbnailLoader'

// Shared IntersectionObserver for all thumbnails - much more efficient
const observerCallbacks = new Map<Element, () => void>()
let sharedObserver: IntersectionObserver | null = null

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = observerCallbacks.get(entry.target)
            if (callback) {
              callback()
              observerCallbacks.delete(entry.target)
              sharedObserver?.unobserve(entry.target)
            }
          }
        })
      },
      { rootMargin: '100px', threshold: 0 }
    )
  }
  return sharedObserver
}

interface LimitedThumbnailProps {
  assetId: number
  name: string
  className?: string
}

export const LimitedThumbnail: React.FC<LimitedThumbnailProps> = memo(
  ({ assetId, name, className }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [imageUrl, setImageUrl] = useState<string | null>(() =>
      thumbnailLoader.getCached(assetId)
    )
    const [hasError, setHasError] = useState(false)
    const [hasTriggered, setHasTriggered] = useState(false)

    useEffect(() => {
      if (imageUrl || hasTriggered || hasError) return

      const element = containerRef.current
      if (!element) return

      const observer = getSharedObserver()

      observerCallbacks.set(element, () => {
        setHasTriggered(true)
      })

      observer.observe(element)

      return () => {
        observerCallbacks.delete(element)
        observer.unobserve(element)
      }
    }, [imageUrl, hasTriggered, hasError])

    // Request thumbnail once triggered
    useEffect(() => {
      if (!hasTriggered || imageUrl || hasError) return

      const cleanup = thumbnailLoader.request(assetId, (url) => {
        if (url) {
          setImageUrl(url)
        } else {
          setHasError(true)
        }
      })

      return cleanup
    }, [assetId, hasTriggered, imageUrl, hasError])

    if (hasError) {
      return (
        <div
          ref={containerRef}
          className={cn(
            'flex items-center justify-center bg-neutral-800 text-neutral-500',
            className
          )}
        >
          <Boxes size={18} />
        </div>
      )
    }

    if (!imageUrl) {
      return (
        <div
          ref={containerRef}
          className={cn('bg-neutral-800', hasTriggered && 'animate-pulse', className)}
        />
      )
    }

    return (
      <img
        ref={containerRef as React.RefObject<HTMLImageElement>}
        src={imageUrl}
        alt={name}
        className={cn('object-cover bg-neutral-800', className)}
      />
    )
  }
)

LimitedThumbnail.displayName = 'LimitedThumbnail'
