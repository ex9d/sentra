import React, { useEffect, useMemo, useState } from 'react'
import { applyTheme, availableThemes, ThemeName } from './theme'
import { ThemePreference } from '../types'
import { ThemeContext, CustomThemeName } from './ThemeContext'

interface ThemeProviderProps {
  initialTheme?: ThemePreference
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialTheme = 'system',
  children
}) => {
  const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const [themePreference, setThemePreference] = useState<ThemePreference>(initialTheme)
  const [systemTheme, setSystemTheme] = useState<ThemeName>(() => getSystemTheme())
  const [customTheme, setCustomTheme] = useState<CustomThemeName>('default')

  const resolvedThemeName: ThemeName = themePreference === 'system' ? systemTheme : themePreference

  const theme = useMemo(
    () => availableThemes[resolvedThemeName] ?? availableThemes.dark,
    [resolvedThemeName]
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light')
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  // Load customTheme from localStorage and persisted settings on mount
  useEffect(() => {
    const stored = localStorage.getItem('app-custom-theme')
    if (stored && ['default', 'hearts', 'aurora', 'ocean', 'forest', 'sunset', 'cosmic', 'ember', 'pixel', 'breeze', 'comet', 'petals'].includes(stored)) {
      setCustomTheme(stored as CustomThemeName)
      console.log('[ThemeProvider] Loaded customTheme from localStorage:', stored)
    }

    // Also try to read from persisted config
    if ((window as any).api?.getSettings) {
      ;(window as any).api.getSettings().then((settings: any) => {
        if (settings?.customTheme) {
          setCustomTheme(settings.customTheme as CustomThemeName)
          localStorage.setItem('app-custom-theme', settings.customTheme)
          console.log('[ThemeProvider] Loaded customTheme from persisted config:', settings.customTheme)
        }
      }).catch(() => {
        // Fallback to localStorage value if API call fails
      })
    }
  }, [])

  const handleSetCustomTheme = (name: CustomThemeName) => {
    setCustomTheme(name)
    localStorage.setItem('app-custom-theme', name)
    console.log('[ThemeProvider] Set customTheme to:', name)
  }

  const value = useMemo(
    () => ({
      theme,
      themeName: resolvedThemeName,
      themePreference,
      setTheme: setThemePreference,
      customTheme,
      setCustomTheme: handleSetCustomTheme
    }),
    [theme, resolvedThemeName, themePreference, customTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
