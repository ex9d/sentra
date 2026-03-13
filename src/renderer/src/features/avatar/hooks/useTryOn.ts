import { useState } from 'react'
import { Account } from '@renderer/types'

interface UseTryOnResult {
  isTryingOn: boolean
  tryOnLoading: boolean
  tryOnImageUrl: string | null
  tryOnManifestUrl: string | null
  handleTryOn: () => Promise<void>
  handleRevertTryOn: () => void
}

export function useTryOn(currentAssetId: number | null, account: Account | null): UseTryOnResult {
  const [isTryingOn, setIsTryingOn] = useState(false)
  const [tryOnLoading, setTryOnLoading] = useState(false)
  const [tryOnImageUrl, setTryOnImageUrl] = useState<string | null>(null)
  const [tryOnManifestUrl, setTryOnManifestUrl] = useState<string | null>(null)

  const handleTryOn = async () => {
    if (!account?.cookie || !currentAssetId || !account.userId) {
      console.error('[useTryOn] Missing required data', { cookie: !!account?.cookie, assetId: currentAssetId, userId: account?.userId })
      return
    }

    const userId = parseInt(account.userId)
    if (isNaN(userId)) {
      console.error('[useTryOn] Invalid userId', account.userId)
      return
    }

    setTryOnLoading(true)
    setTryOnImageUrl(null)
    setTryOnManifestUrl(null)
    setIsTryingOn(false)
    
    try {
      // Use the render preview API to generate a preview without modifying the avatar
      const result = await (window as any).api.renderAvatarPreview(
        account.cookie,
        userId,
        currentAssetId
      )

      console.log('[useTryOn] Got render result:', result)
      console.log('[useTryOn] imageUrl type:', typeof result.imageUrl, 'value:', result.imageUrl)

      if (result.imageUrl) {
        // Extract URL string - handle case where it might be wrapped
        const imageUrlStr = typeof result.imageUrl === 'string' 
          ? result.imageUrl 
          : (result.imageUrl as any)?.imageUrl || String(result.imageUrl)
        
        console.log('[useTryOn] Extracted URL string:', imageUrlStr)
        
        // Trust the API's renderType if provided, otherwise auto-detect
        let renderType = result.renderType
        
        if (!renderType) {
          // Fallback detection based on URL
          const normalized = imageUrlStr.toLowerCase()
          renderType = (
            normalized.endsWith('.json') ||
            normalized.includes('.json?') ||
            normalized.includes('avatar-3d') ||
            normalized.includes('thumbnail-3d') ||
            normalized.includes('/manifest')
          ) ? '3d' : '2d'
        }

        console.log('[useTryOn] Using render type:', renderType)
        
        if (renderType === '3d') {
          console.log('[useTryOn] Setting manifest URL:', imageUrlStr)
          setTryOnManifestUrl(imageUrlStr)
          setTryOnImageUrl(null)
        } else {
          console.log('[useTryOn] Setting image URL:', imageUrlStr)
          setTryOnImageUrl(imageUrlStr)
          setTryOnManifestUrl(null)
        }
        
        setIsTryingOn(true)
      } else {
        console.error('[useTryOn] No imageUrl in result:', result)
      }
    } catch (err) {
      console.error('[useTryOn] Failed to generate try-on preview:', err)
      const errorMsg = (err as Error)?.message || 'Try-on failed'
      if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        console.warn('[useTryOn] Try-on timed out - Roblox API was slow. Try again.')
      }
    } finally {
      setTryOnLoading(false)
    }
  }

  const handleRevertTryOn = () => {
    // Simply clear the try-on state - no need to revert anything since we didn't modify the avatar
    setIsTryingOn(false)
    setTryOnImageUrl(null)
    setTryOnManifestUrl(null)
  }

  return {
    isTryingOn,
    tryOnLoading,
    tryOnImageUrl,
    tryOnManifestUrl,
    handleTryOn,
    handleRevertTryOn
  }
}
