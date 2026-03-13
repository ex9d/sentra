import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export interface ContextMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

export interface ContextMenuSection {
  items: ContextMenuItem[]
}

interface GenericContextMenuProps {
  position: { x: number; y: number } | null
  sections: ContextMenuSection[]
  onClose: () => void
  width?: number
}

const GenericContextMenu: React.FC<GenericContextMenuProps> = ({
  position,
  sections,
  onClose,
  width = 200
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (position) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [position, onClose])

  if (!position) return null

  // Calculate position to keep menu within viewport
  const menuHeight = sections.reduce((acc, section) => acc + section.items.length * 44 + 8, 0) + 16
  const x = Math.min(position.x, window.innerWidth - width - 10)
  const y = Math.min(position.y, window.innerHeight - menuHeight - 10)

  return createPortal(
    <AnimatePresence>
      {position && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-[1100] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden"
          style={{ top: y, left: x, width }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="p-1.5">
            {sections.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {sectionIndex > 0 && <div className="h-px bg-[var(--color-border)] my-1" />}
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => {
                      item.onClick()
                      onClose()
                    }}
                    className={`pressable w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 rounded-lg transition-colors ${
                      item.variant === 'danger'
                        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default GenericContextMenu
