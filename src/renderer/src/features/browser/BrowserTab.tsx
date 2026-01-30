import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ExternalLink } from 'lucide-react'
import { Button } from '@renderer/components/UI/buttons/Button'

export const BrowserTab: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [linkInput, setLinkInput] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = buttonRef.current?.getBoundingClientRect()
    setMenuPos({
      x: rect?.left ?? 0,
      y: (rect?.bottom ?? 0) + 8
    })
    setIsMenuOpen(true)
  }

  const handleOpenHome = () => {
    window.open('https://roblox.com/home', '_blank')
    closeMenu()
  }

  const handleOpenLink = () => {
    setShowLinkDialog(true)
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
      className="flex flex-col items-center justify-center h-full w-full gap-6"
      onClick={closeMenu}
    >
      {}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <div
          ref={buttonRef}
          onContextMenu={handleContextMenu}
          className="cursor-context-menu"
        >
          <Button
            size="lg"
            className="px-8 py-4 rounded-lg flex items-center gap-2 hover:shadow-lg transition-shadow"
          >
            <Home size={20} />
            Open Browser
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Right-click for options</p>
      </motion.div>

      {}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
            style={{
              left: `${menuPos.x}px`,
              top: `${menuPos.y}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                onClick={handleOpenHome}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Home size={16} />
                Open Home
              </button>
              <button
                onClick={handleOpenLink}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <ExternalLink size={16} />
                Open Link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      {showLinkDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          onClick={() => setShowLinkDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background border border-border rounded-lg p-6 w-96 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Open Link</h2>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleOpenCustomLink()
                }
              }}
              placeholder="Enter URL (e.g., roblox.com or https://example.com)"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false)
                  setLinkInput('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleOpenCustomLink}
                disabled={!linkInput.trim()}
              >
                Open
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default BrowserTab