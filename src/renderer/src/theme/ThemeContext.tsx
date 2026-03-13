import { createContext, useContext } from 'react'
import { getTheme, ThemeDefinition, ThemeName } from './theme'
import { ThemePreference } from '../types'

export type CustomThemeName =
  | 'default'
  | 'hearts'
  | 'aurora'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'cosmic'
  | 'ember'
  | 'pixel'
  | 'breeze'
  | 'comet'
  | 'petals'

export type ThemeContextValue = {
  theme: ThemeDefinition
  themeName: ThemeName
  themePreference: ThemePreference
  setTheme: (name: ThemePreference) => void
  customTheme: CustomThemeName
  setCustomTheme: (name: CustomThemeName) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme('dark'),
  themeName: 'dark',
  themePreference: 'system',
  setTheme: () => {},
  customTheme: 'default' as CustomThemeName,
  setCustomTheme: () => {}
})

export const useTheme = () => useContext(ThemeContext)
