import type { LucideIcon } from 'lucide-react'
import { TabId } from '@renderer/types'
import {
  Box,
  Code,
  Eye,
  Gamepad2,
  HardDrive,
  Newspaper,
  Package,
  ScrollText,
  Settings as SettingsIcon,
  ShoppingBag,
  User,
  UserCheck,
  Users,
  UsersRound,
  RotateCw,
  Target,
  Wand2,
  Network
} from 'lucide-react'

export type SidebarSection = 'profile' | 'explore' | 'system' | 'settings'

export interface SidebarTabDefinition {
  id: TabId
  label: string
  icon: LucideIcon
  section: SidebarSection
  locked?: boolean
}

export const SIDEBAR_TAB_DEFINITIONS: SidebarTabDefinition[] = [
  { id: 'Accounts', label: 'Accounts', icon: Users, section: 'profile' },
  { id: 'Profile', label: 'Profile', icon: User, section: 'profile' },
  { id: 'Friends', label: 'Friends', icon: UserCheck, section: 'profile' },
  { id: 'Groups', label: 'Groups', icon: UsersRound, section: 'profile' },
  { id: 'Avatar', label: 'Avatar', icon: Box, section: 'profile' },
  { id: 'News', label: 'News', icon: Newspaper, section: 'profile' },
  { id: 'Games', label: 'Games', icon: Gamepad2, section: 'explore' },
  { id: 'Catalog', label: 'Catalog', icon: ShoppingBag, section: 'explore' },
  { id: 'Inventory', label: 'Inventory', icon: Package, section: 'explore' },
  { id: 'Transactions', label: 'Transactions', icon: ScrollText, section: 'explore' },
  { id: 'Install', label: 'Install', icon: HardDrive, section: 'system' },
  { id: 'Executor', label: 'Executors', icon: Code, section: 'system' },
  { id: 'Watcher', label: 'Watcher', icon: Eye, section: 'system' },
  // { id: 'Macro', label: 'Macro', icon: RotateCw, section: 'system' }, // Disabled
  { id: 'Sniper', label: 'Sniper', icon: Target, section: 'system' },
  { id: 'Generator', label: 'Generator', icon: Wand2, section: 'system' },
  { id: 'Proxy', label: 'Proxy', icon: Network, section: 'system' },
  { id: 'Logs', label: 'Logs', icon: ScrollText, section: 'system' },
  { id: 'Settings', label: 'App Settings', icon: SettingsIcon, section: 'settings', locked: true },
  { id: 'AccountSettings', label: 'Roblox Settings', icon: SettingsIcon, section: 'settings' }
]

export const SIDEBAR_TAB_DEFINITION_MAP: Record<TabId, SidebarTabDefinition | undefined> =
  SIDEBAR_TAB_DEFINITIONS.reduce(
    (acc, tab) => {
      acc[tab.id] = tab
      return acc
    },
    {} as Record<TabId, SidebarTabDefinition | undefined>
  )
