import { CommandFactory } from './types'

export const createNavigationCommands: CommandFactory = (callbacks) => [
  {
    id: 'nav-accounts',
    label: 'Go to Accounts',
    icon: 'users',
    category: 'navigation',
    keywords: ['home', 'main', 'list'],
    action: () => callbacks.setActiveTab('Accounts')
  },
  {
    id: 'nav-profile',
    label: 'Go to Profile',
    icon: 'user',
    category: 'navigation',
    keywords: ['me', 'my'],
    action: () => callbacks.setActiveTab('Profile')
  },
  {
    id: 'nav-friends',
    label: 'Go to Friends',
    icon: 'users',
    category: 'navigation',
    action: () => callbacks.setActiveTab('Friends')
  },
  {
    id: 'nav-games',
    label: 'Go to Games',
    icon: 'gamepad',
    category: 'navigation',
    keywords: ['play', 'browse'],
    action: () => callbacks.setActiveTab('Games')
  },
  {
    id: 'nav-avatar',
    label: 'Go to Avatar',
    icon: 'palette',
    category: 'navigation',
    keywords: ['customize', 'outfit'],
    action: () => callbacks.setActiveTab('Avatar')
  },
  {
    id: 'nav-install',
    label: 'Go to Installations',
    icon: 'download',
    category: 'navigation',
    keywords: ['roblox', 'version'],
    action: () => callbacks.setActiveTab('Install')
  },
  {
    id: 'nav-logs',
    label: 'Go to Logs',
    icon: 'file',
    category: 'navigation',
    action: () => callbacks.setActiveTab('Logs')
  },
  {
    id: 'nav-settings',
    label: 'Go to Settings',
    icon: 'settings',
    category: 'navigation',
    keywords: ['preferences', 'config'],
    action: () => callbacks.setActiveTab('Settings')
  }
]
