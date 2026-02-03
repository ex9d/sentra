import { ThemePreference, TintPreference } from '../types'

export type ThemeName = 'dark' | 'light'

type ThemeColors = {
  appBackground: string
  surface: string
  surfaceStrong: string
  surfaceMuted: string
  surfaceHover: string
  titlebar: string
  border: string
  borderStrong: string
  borderSubtle: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  mutedBackground: string
  focusRing: string
  shadowLg: string
  success: string
  error: string
}

export type ThemeDefinition = {
  name: ThemeName
  colors: ThemeColors
  radii: {
    md: string
    lg: string
    xl: string
    pill: string
  }
}

const commonRadii = {
  md: '6px',
  lg: '10px',
  xl: '14px',
  pill: '999px'
}

const themes: Record<ThemeName, ThemeDefinition> = {
  dark: {
    name: 'dark',
    colors: {
      appBackground: '#050505',
      surface: '#0c0c0c',
      surfaceStrong: '#111111',
      surfaceMuted: '#151515',
      surfaceHover: '#1b1b1b',
      titlebar: '#151515',
      border: '#1f1f1f',
      borderStrong: '#292929',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
      textPrimary: '#f6f7fb',
      textSecondary: '#d6d8e0',
      textMuted: '#9ea3b3',
      mutedBackground: 'rgba(255, 255, 255, 0.02)',
      focusRing: 'rgba(255, 255, 255, 0.14)',
      shadowLg: '0 24px 72px rgba(0, 0, 0, 0.45)',
      success: '#22c55e',
      error: '#ef4444'
    },
    radii: commonRadii
  },
  light: {
    name: 'light',
    colors: {
      appBackground: '#f6f6f6',
      surface: '#ffffff',
      surfaceStrong: '#f4f4f5',
      surfaceMuted: '#ededed',
      surfaceHover: '#e7e7e7',
      titlebar: '#ffffff',
      border: '#d6d6d6',
      borderStrong: '#bdbdbd',
      borderSubtle: 'rgba(15, 23, 42, 0.08)',
      textPrimary: '#0f172a',
      textSecondary: '#1f2937',
      textMuted: '#4b5563',
      mutedBackground: '#e5e7eb',
      focusRing: 'rgba(0, 208, 145, 0.35)',
      shadowLg: '0 20px 60px rgba(15, 23, 42, 0.1)',
      success: '#22c55e',
      error: '#ef4444'
    },
    radii: commonRadii
  }
}

const tintPalettes: Record<
  ThemeName,
  Record<
    TintPreference,
    Pick<
      ThemeColors,
      | 'appBackground'
      | 'surface'
      | 'surfaceStrong'
      | 'surfaceMuted'
      | 'surfaceHover'
      | 'titlebar'
      | 'border'
      | 'borderStrong'
    >
  >
> = {
  dark: {
    neutral: {
      appBackground: '#050505',
      surface: '#0c0c0c',
      surfaceStrong: '#111111',
      surfaceMuted: '#151515',
      surfaceHover: '#1b1b1b',
      titlebar: '#151515',
      border: '#1f1f1f',
      borderStrong: '#292929'
    },
    cool: {
      appBackground: '#050507',
      surface: '#0c0c10',
      surfaceStrong: '#111118',
      surfaceMuted: '#15151d',
      surfaceHover: '#1b1b23',
      titlebar: '#15151d',
      border: '#1f1f26',
      borderStrong: '#292933'
    }
    ,
    warm: {
      appBackground: '#050502',
      surface: '#0c0b0a',
      surfaceStrong: '#12100f',
      surfaceMuted: '#171413',
      surfaceHover: '#1c1918',
      titlebar: '#151211',
      border: '#1f1b1a',
      borderStrong: '#2b2524'
    },
    forest: {
      appBackground: '#050705',
      surface: '#0c0f0c',
      surfaceStrong: '#111611',
      surfaceMuted: '#161b15',
      surfaceHover: '#1c211b',
      titlebar: '#151a14',
      border: '#1f241f',
      borderStrong: '#2a302a'
    },
    twilight: {
      appBackground: '#07050b',
      surface: '#0f0d14',
      surfaceStrong: '#15121a',
      surfaceMuted: '#1a1720',
      surfaceHover: '#211e28',
      titlebar: '#17131c',
      border: '#26222b',
      borderStrong: '#332e37'
    }
  },
  light: {
    neutral: {
      appBackground: '#f6f6f6',
      surface: '#ffffff',
      surfaceStrong: '#f4f4f5',
      surfaceMuted: '#ededed',
      surfaceHover: '#e7e7e7',
      titlebar: '#ffffff',
      border: '#d6d6d6',
      borderStrong: '#bdbdbd'
    },
    cool: {
      appBackground: '#f5f7fb',
      surface: '#ffffff',
      surfaceStrong: '#f8f9fb',
      surfaceMuted: '#f0f2f7',
      surfaceHover: '#eaedf5',
      titlebar: '#ffffff',
      border: '#dce1eb',
      borderStrong: '#c8d0e0'
    }
    ,
    warm: {
      appBackground: '#fff6f3',
      surface: '#fffdfb',
      surfaceStrong: '#fff7f4',
      surfaceMuted: '#fff3f0',
      surfaceHover: '#fff0ee',
      titlebar: '#fffdfb',
      border: '#f6d7cf',
      borderStrong: '#efc4b7'
    },
    forest: {
      appBackground: '#f6faf6',
      surface: '#ffffff',
      surfaceStrong: '#f9fdf9',
      surfaceMuted: '#f0f5f0',
      surfaceHover: '#ebf1eb',
      titlebar: '#ffffff',
      border: '#dce8dc',
      borderStrong: '#cfe0cf'
    },
    twilight: {
      appBackground: '#f6f5fb',
      surface: '#ffffff',
      surfaceStrong: '#fbf9ff',
      surfaceMuted: '#f3f1f8',
      surfaceHover: '#eeecf6',
      titlebar: '#ffffff',
      border: '#e1dbef',
      borderStrong: '#cfc6e6'
    }
  }
}

const setCssVariable = (key: string, value: string) => {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(key, value)
}

export const getCurrentThemeNameFromDom = (): ThemeName => {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export const applyTint = (themeName: ThemeName, tint: TintPreference) => {
  const palette = tintPalettes[themeName]?.[tint] ?? tintPalettes[themeName]?.neutral
  if (!palette) return

  setCssVariable('--color-app-bg', palette.appBackground)
  setCssVariable('--color-surface', palette.surface)
  setCssVariable('--color-surface-strong', palette.surfaceStrong)
  setCssVariable('--color-surface-muted', palette.surfaceMuted)
  setCssVariable('--color-surface-hover', palette.surfaceHover)
  setCssVariable('--color-titlebar', palette.titlebar)
  setCssVariable('--color-border', palette.border)
  setCssVariable('--color-border-strong', palette.borderStrong)
}

export const applyTheme = (theme: ThemeDefinition) => {
  const { colors, radii } = theme
  const tint =
    (typeof document !== 'undefined'
      ? (document.documentElement.dataset.tint as TintPreference | undefined)
      : undefined) ?? 'neutral'

  applyTint(theme.name, tint)
  setCssVariable('--color-border-subtle', colors.borderSubtle)
  setCssVariable('--color-text-primary', colors.textPrimary)
  setCssVariable('--color-text-secondary', colors.textSecondary)
  setCssVariable('--color-text-muted', colors.textMuted)
  setCssVariable('--color-muted-bg', colors.mutedBackground)
  setCssVariable('--focus-ring', colors.focusRing)
  setCssVariable('--shadow-lg', colors.shadowLg)
  setCssVariable('--color-success', colors.success)
  setCssVariable('--color-error', colors.error)

  setCssVariable('--radius-md', radii.md)
  setCssVariable('--radius-lg', radii.lg)
  setCssVariable('--radius-xl', radii.xl)
  setCssVariable('--radius-pill', radii.pill)

  document.documentElement.dataset.theme = theme.name
}

export const getTheme = (name: ThemeName = 'dark'): ThemeDefinition => themes[name]

export const availableThemes = themes

export type { ThemePreference }
