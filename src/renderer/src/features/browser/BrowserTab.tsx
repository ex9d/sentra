import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ExternalLink, Globe } from 'lucide-react'
import { Button } from '@renderer/components/UI/buttons/Button'

export const BrowserTab: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [linkInput, setLinkInput] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const closeMenu = () => setIsMenuOpen(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    // Using clientX/Y to ensure it follows the mouse exactly
    setMenuPos({ x: e.clientX, y: e.clientY })
    setIsMenuOpen(true)
  }

  const handleOpenHome = () => {
    window.open('https://roblox.com/home', '_blank')
    closeMenu()
  }

  const handleOpenCustomLink = () => {
    if (linkInput.trim()) {
      let url = linkInput.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      window.open(url, '_blank')
      setLinkInput('')
      setShowLinkDialog(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center h-full w-full min-h-[400px] bg-[#0a0a0a]"
      onClick={closeMenu}
      onContextMenu={(e) => e.preventDefault()} // Prevent default system menu
    >
      {/* Center UI */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center gap-6"
      >
        <div onContextMenu={handleContextMenu} className="relative">
          <Button
            size="lg"
            onClick={handleOpenHome}
            className="px-10 py-6 rounded-xl flex items-center gap-3 bg-[#ffffff] text-[#000000] hover:bg-[#e5e5e5] transition-all shadow-2xl"
          >
            <Globe size={24} />
            <span className="text-lg font-bold">Open Browser</span>
          </Button>
        </div>
        <p className="text-neutral-500 text-sm font-medium tracking-wide">
          Right-click for more options
        </p>
      </motion.div>

      {/* Context Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              position: 'fixed',
              left: menuPos.x, 
              top: menuPos.y,
              zIndex: 9999 
            }}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl py-1 min-w-[180px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleOpenHome}
              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#333] flex items-center gap-3 transition-colors"
            >
              <Home size={16} className="text-neutral-400" />
              Open Home
            </button>
            <button
              onClick={() => { setShowLinkDialog(true); closeMenu(); }}
              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#333] flex items-center gap-3 transition-colors border-t border-[#262626]"
            >
              <ExternalLink size={16} className="text-neutral-400" />
              Enter URL...
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL Dialog */}
      <AnimatePresence>
        {showLinkDialog && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowLinkDialog(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#111] border border-[#333] rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-2">Navigate</h2>
              <p className="text-neutral-400 mb-6">Type a URL to open in your browser.</p>
              
              <input
                autoFocus
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenCustomLink()}
                placeholder="roblox.com"
                className="w-full px-4 py-4 bg-[#1a1a1a] border border-[#444] rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-[#666] mb-6 transition-all"
              />
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-6 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleOpenCustomLink}
                  disabled={!linkInput.trim()}
                  className="px-8 bg-white text-black hover:bg-neutral-200"
                >
                  Go
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BrowserTab