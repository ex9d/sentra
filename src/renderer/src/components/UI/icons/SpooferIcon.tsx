import React from 'react'

interface SpooferIconProps {
  size?: number
  className?: string
}

const SpooferIcon: React.FC<SpooferIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Shield with diagonal scan lines */}
      <path d="M12 2L3 6v6c0 7 9 11 9 11s9-4 9-11V6l-9-4z" />
      {/* Diagonal scan lines for "spoofing" effect */}
      <line x1="7" y1="8" x2="17" y2="8" strokeWidth="1.5" />
      <line x1="6" y1="12" x2="18" y2="12" strokeWidth="1.5" />
      <line x1="7" y1="16" x2="17" y2="16" strokeWidth="1.5" />
      {/* Glitch effect - offset square in corner */}
      <rect x="14" y="3" width="3" height="3" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export default SpooferIcon
