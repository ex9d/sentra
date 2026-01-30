import React from 'react'

interface BackupIconProps {
  size?: number
  className?: string
}

const BackupIcon: React.FC<BackupIconProps> = ({ size = 24, className = '' }) => {
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
      {/* Database/cylinder shape */}
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      {/* Top part of cylinder */}
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      {/* Bottom ellipse */}
      <ellipse cx="12" cy="15" rx="7" ry="3" />
      {/* Lock/shield indicator on right */}
      <rect x="16" y="7" width="3" height="4" rx="0.5" fill="currentColor" />
      {/* Checkmark inside lock */}
      <path d="M17 9l0.5 0.5 1-1" strokeWidth="1.5" stroke="currentColor" />
    </svg>
  )
}

export default BackupIcon
