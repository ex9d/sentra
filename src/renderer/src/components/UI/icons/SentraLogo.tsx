export function SentraLogo({ className }: { className?: string }) {
  return (
    <svg width="1200" height="1200" viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M200 800L600 200L1000 800H800L600 400L400 800H200Z" fill="#4B5563"/>
      
      <path d="M400 800L600 400L800 800H400Z" fill="var(--accent-color)"/>
      
      <path d="M600 400L800 800L700 800L600 600L500 800L400 800L600 400Z" fill="#9CA3AF" fillOpacity="0.3"/>
    </svg>
  )
}
