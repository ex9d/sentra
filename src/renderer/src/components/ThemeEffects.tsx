import { useEffect, useRef } from 'react'
import { useTheme } from '@renderer/theme/ThemeContext'

type ThemeConfig = {
  symbol: string
  count: number
  color: { r: number; g: number; b: number }
  animation: string
  size: { min: number; max: number }
  duration: { min: number; max: number }
  palette?: string[]
}

const THEME_CONFIGS: Record<string, ThemeConfig> = {
  hearts: {
    symbol: '❤',
    count: 12,
    color: { r: 255, g: 68, b: 68 }, // Red
    animation: 'fall-hearts',
    size: { min: 12, max: 28 },
    duration: { min: 10, max: 16 },
    palette: ['#ff2d55', '#ff6b81', '#ff9aa2']
  },
  aurora: {
    symbol: '✨',
    count: 14,
    color: { r: 179, g: 102, b: 255 }, // Purple
    animation: 'float-aurora',
    size: { min: 14, max: 26 },
    duration: { min: 14, max: 22 },
    palette: ['#8b5cf6', '#34d399', '#60a5fa']
  },
  ocean: {
    symbol: '●',
    count: 10,
    color: { r: 68, g: 136, b: 255 }, // Blue
    animation: 'rise-ocean',
    size: { min: 12, max: 26 },
    duration: { min: 9, max: 14 },
    palette: ['#3b82f6', '#06b6d4', '#60a5fa']
  },
  forest: {
    symbol: '🍃',
    count: 16,
    color: { r: 68, g: 204, b: 68 }, // Green
    animation: 'fall-forest',
    size: { min: 14, max: 28 },
    duration: { min: 10, max: 18 },
    palette: ['#22c55e', '#16a34a', '#86efac']
  },
  sunset: {
    symbol: '✦',
    count: 12,
    color: { r: 255, g: 136, b: 68 }, // Orange
    animation: 'drift-sunset',
    size: { min: 10, max: 20 },
    duration: { min: 12, max: 20 },
    palette: ['#fb923c', '#f97316', '#ffb86b']
  },
  cosmic: {
    symbol: '★',
    count: 14,
    color: { r: 68, g: 221, b: 255 }, // Cyan
    animation: 'twinkle-cosmic',
    size: { min: 12, max: 22 },
    duration: { min: 8, max: 12 },
    palette: ['#7c3aed', '#06b6d4', '#60a5fa']
  },
  ember: {
    symbol: '•',
    count: 12,
    color: { r: 255, g: 120, b: 60 }, // Ember orange
    animation: 'rise-ember',
    size: { min: 12, max: 24 },
    duration: { min: 8, max: 12 },
    palette: ['#ff7a45', '#ff5722', '#ffb86b']
  },
  pixel: {
    symbol: '▪',
    count: 20,
    color: { r: 200, g: 200, b: 200 }, // gray-ish
    animation: 'fall-pixel',
    size: { min: 12, max: 24 },
    duration: { min: 8, max: 14 },
    palette: ['#10b981', '#06b6d4', '#f59e0b', '#ef4444']
  },
  breeze: {
    symbol: '·',
    count: 16,
    color: { r: 200, g: 240, b: 255 }, // pale
    animation: 'drift-breeze',
    size: { min: 10, max: 20 },
    duration: { min: 10, max: 18 },
    palette: ['#bae6fd', '#c7f9f7', '#e0f2fe']
  },
  comet: {
    symbol: '✸',
    count: 10,
    color: { r: 255, g: 220, b: 120 }, // warm
    animation: 'streak-comet',
    size: { min: 12, max: 28 },
    duration: { min: 6, max: 10 },
    palette: ['#ffd166', '#ffb703', '#ff6b6b']
  },
  petals: {
    symbol: '❀',
    count: 14,
    color: { r: 255, g: 182, b: 193 }, // pink
    animation: 'fall-petals',
    size: { min: 14, max: 28 },
    duration: { min: 10, max: 18 },
    palette: ['#ffb6c1', '#ff7ab6', '#ffc9de']
  }
}

const ANIMATIONS = `
  @keyframes fall-hearts {
    0% { transform: translateY(-80px) translateX(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) translateX(80px) rotate(360deg); opacity: 0; }
  }
  @keyframes float-aurora {
    0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
    25% { opacity: 1; }
    75% { opacity: 1; }
    100% { transform: translateY(-120px) translateX(150px) scale(0.6); opacity: 0; }
  }
  @keyframes rise-ocean {
    0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateY(-80px) translateX(60px) scale(0.4); opacity: 0; }
  }
  @keyframes fall-forest {
    0% { transform: translateY(-80px) translateX(0) rotate(0deg); opacity: 1; }
    50% { transform: translateY(50vh) translateX(60px) rotate(180deg); opacity: 1; }
    100% { transform: translateY(100vh) translateX(140px) rotate(360deg); opacity: 0; }
  }
  @keyframes drift-sunset {
    0% { transform: translateY(-40px) translateX(-40px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) translateX(160px) rotate(360deg); opacity: 0; }
  }
  @keyframes twinkle-cosmic {
    0% { opacity: 0.3; transform: translateY(100vh) scale(1); }
    25% { opacity: 1; transform: translateY(75vh) scale(1.2); }
    50% { opacity: 0.5; transform: translateY(50vh) scale(0.9); }
    75% { opacity: 1; transform: translateY(25vh) scale(1.1); }
    100% { opacity: 0.3; transform: translateY(-40px) scale(1); }
  }
  
  @keyframes rise-ember {
    0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translateY(-60px) translateX(40px) scale(0.5); opacity: 0; }
  }
  @keyframes fall-pixel {
    0% { transform: translateY(-60px) translateX(0) scale(1); opacity: 1; }
    100% { transform: translateY(100vh) translateX(40px) scale(0.8); opacity: 0; }
  }
  @keyframes drift-breeze {
    0% { transform: translateY(100vh) translateX(0) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateY(-80px) translateX(120px) rotate(20deg); opacity: 0; }
  }
  @keyframes streak-comet {
    0% { transform: translateY(-40px) translateX(-60px) scale(1); opacity: 1; }
    100% { transform: translateY(100vh) translateX(200px) scale(0.4); opacity: 0; }
  }
  @keyframes fall-petals {
    0% { transform: translateY(-80px) translateX(0) rotate(0deg); opacity: 1; }
    50% { transform: translateY(55vh) translateX(40px) rotate(120deg); opacity: 1; }
    100% { transform: translateY(100vh) translateX(120px) rotate(240deg); opacity: 0; }
  }
  
`

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const cleaned = hex.replace('#', '')
  const full = cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned
  const val = parseInt(full, 16)
  return { r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255 }
}

export const ThemeEffects = () => {
  const { customTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement[]>([])
  const intervalRef = useRef<number | null>(null)
  const configRef = useRef<ThemeConfig | null>(null)

  useEffect(() => {
    console.log('[ThemeEffects] customTheme changed to:', customTheme)

    // Don't render particles when using default theme
    const activeTheme = customTheme

    if (!THEME_CONFIGS[activeTheme]) {
      console.log('[ThemeEffects] Clearing particles (theme not found)')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        particlesRef.current = []
      }
      return
    }

    if (!containerRef.current) {
      console.warn('[ThemeEffects] containerRef is not available')
      return
    }

    const config = THEME_CONFIGS[activeTheme]
    const container = containerRef.current
    console.log(`[ThemeEffects] Starting spawn pool (${config.count}) for ${activeTheme}`)

    // Create CSS animations if not already present
    if (!document.getElementById('theme-animations-style')) {
      const style = document.createElement('style')
      style.id = 'theme-animations-style'
      style.textContent = ANIMATIONS
      document.head.appendChild(style)
    }

    // Clear previous particles
    container.innerHTML = ''
    particlesRef.current = []

    let cancelled = false

    const spawnOne = () => {
      if (cancelled) return
      if (!containerRef.current) return
      if (particlesRef.current.length >= config.count) return

      const particle = document.createElement('div')
      const left = Math.random() * 100
      const delay = 0 // start immediately, no delay
      const duration = config.duration.min + Math.random() * (config.duration.max - config.duration.min)
      const size = config.size.min + Math.random() * (config.size.max - config.size.min)
      const opacity = 0.5 + Math.random() * 0.25

      // choose color from palette if provided, otherwise use base color
      let chosenRgb = config.color
      if (config.palette && config.palette.length > 0) {
        try {
          const hex = config.palette[Math.floor(Math.random() * config.palette.length)]
          chosenRgb = hexToRgb(hex)
        } catch (e) {
          chosenRgb = config.color
        }
      }

      particle.innerHTML = config.symbol
      particle.style.position = 'absolute'
      particle.style.left = `${left}%`
      particle.style.top = '0px'
      particle.style.fontSize = `${size}px`
      particle.style.color = `rgba(${chosenRgb.r}, ${chosenRgb.g}, ${chosenRgb.b}, ${opacity})`
      particle.style.pointerEvents = 'none'
      particle.style.textShadow = `0 0 14px rgba(${chosenRgb.r}, ${chosenRgb.g}, ${chosenRgb.b}, ${opacity * 0.7})`
      // start the main movement animation immediately
      particle.style.animation = `${config.animation} ${duration}s linear ${delay}s 1 forwards`
      particle.style.filter = `drop-shadow(0 0 8px rgba(${chosenRgb.r}, ${chosenRgb.g}, ${chosenRgb.b}, ${opacity * 0.6}))`
      particle.style.userSelect = 'none'
      particle.style.willChange = 'transform, opacity'
      particle.style.display = 'block'

      const onMainEnd = () => {
        particle.removeEventListener('animationend', onMainEnd)
        const idx = particlesRef.current.indexOf(particle)
        if (idx !== -1) particlesRef.current.splice(idx, 1)
        if (particle.parentElement) particle.parentElement.removeChild(particle)
        if (!cancelled) {
          setTimeout(() => spawnOne(), 300 + Math.random() * 1200)
        }
      }
      particle.addEventListener('animationend', onMainEnd)

      container.appendChild(particle)
      particlesRef.current.push(particle)
    }

    // Kick off an immediate small burst and then keep trying to top-up the pool
    for (let i = 0; i < Math.min(3, config.count); i++) spawnOne()

    intervalRef.current = window.setInterval(() => {
      if (particlesRef.current.length < config.count) spawnOne()
    }, 700)

    // Store config for visibility change handler
    configRef.current = config

    // Handle window visibility change (minimize/restore) - only pause on actual minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Window hidden (minimized) - pause particle spawning
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Window visible again - resume particle spawning
        if (intervalRef.current === null && configRef.current) {
          intervalRef.current = window.setInterval(() => {
            if (particlesRef.current.length < config.count) spawnOne()
          }, 700)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        particlesRef.current = []
      }
    }
  }, [customTheme])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
        backgroundColor: 'transparent'
      }}
    />
  )
}
