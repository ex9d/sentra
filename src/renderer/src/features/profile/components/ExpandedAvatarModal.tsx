import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import Avatar3DThumbnail from '@renderer/components/Avatar/Avatar3DThumbnail'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/UI/display/Avatar'
import { ProfileData } from '../hooks/useProfileData'

interface ExpandedAvatarModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  profile: ProfileData
  cookie?: string
}

export const ExpandedAvatarModal: React.FC<ExpandedAvatarModalProps> = ({
  isOpen,
  onClose,
  userId,
  profile,
  cookie
}) => {
  // Track if 3D viewer should be mounted (delayed unmount for exit animation)
  const [shouldMount3D, setShouldMount3D] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldMount3D(true)
    }
  }, [isOpen])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape, true) // Use capture phase to handle before other handlers
      return () => {
        window.removeEventListener('keydown', handleEscape, true)
      }
    }
    return undefined
  }, [isOpen, onClose])

  const handleExitComplete = () => {
    // Unmount 3D viewer after exit animation completes
    if (!isOpen) {
      setShouldMount3D(false)
    }
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          {/* Animated Grid Floor */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .03) 25%, rgba(255, 255, 255, .03) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .03) 75%, rgba(255, 255, 255, .03) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .03) 25%, rgba(255, 255, 255, .03) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .03) 75%, rgba(255, 255, 255, .03) 76%, transparent 77%, transparent)',
              backgroundSize: '80px 80px',
              transform: 'perspective(1000px) rotateX(60deg) translateY(20%) scale(2)',
              transformOrigin: 'center center'
            }}
          />

          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] pointer-events-none" />

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.1 }}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="absolute top-10 right-6 z-10 p-3 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-full transition-colors backdrop-blur-md border border-neutral-700/50 cursor-pointer"
          >
            <X size={24} />
          </motion.button>

          {/* User info badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.15 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 pl-4 pr-6 py-3 bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-700/50"
          >
            <Avatar className="w-12 h-12 shadow-lg">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback className="text-sm font-bold text-white bg-neutral-800">
                {profile.displayName?.slice(0, 2)?.toUpperCase() || 'RB'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-bold text-white">{profile.displayName}</div>
              <div className="text-sm text-neutral-400">@{profile.username}</div>
            </div>
          </motion.div>

          {/* Hint text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-10 text-neutral-500 text-sm font-medium"
          >
            Drag to rotate • Scroll to zoom • ESC or click anywhere to close
          </motion.div>

          {/* 3D Avatar Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="relative w-[80vw] h-[80vh] max-w-[1200px] max-h-[900px] mx-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {shouldMount3D && (
              <Avatar3DThumbnail
                userId={userId.toString()}
                cookie={cookie}
                className="w-full h-full drop-shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                autoRotateSpeed={0.002}
                cameraDistanceFactor={1.6}
                manualRotationEnabled={true}
                manualZoomEnabled={true}
                manualPanEnabled={true}
                manualZoomLimits={{ min: 4, max: 30 }}
                manualRotationSensitivity={0.006}
                verticalOffset={0.5}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
