import type { TabId } from '../renderer/src/types'

export const SIDEBAR_TAB_IDS = [
  'Accounts',
  'Profile',
  'Friends',
  'Groups',
  'Avatar',
  'News',
  'Games',
  'Catalog',
  'Inventory',
  'Transactions',
  'Install',
  'Logs',
  'Settings',
  'AccountSettings'
] as const satisfies readonly TabId[]

export const DEFAULT_SIDEBAR_TAB_ORDER: TabId[] = [
  'Accounts',
  'Profile',
  'Friends',
  'Groups',
  'Avatar',
  'News',
  'Games',
  'Catalog',
  'Inventory',
  'Transactions',
  'Install',
  'Logs',
  'Settings',
  'AccountSettings'
]

export const LOCKED_SIDEBAR_TABS: TabId[] = ['Settings']




export const sanitizeSidebarOrder = (order?: TabId[]): TabId[] => {
  const provided = Array.isArray(order) ? order : []
  const seen = new Set<TabId>()
  const valid: TabId[] = []

  for (const tab of provided) {
    if (SIDEBAR_TAB_IDS.includes(tab as TabId) && !seen.has(tab as TabId)) {
      const casted = tab as TabId
      valid.push(casted)
      seen.add(casted)
    }
  }

  for (const tab of SIDEBAR_TAB_IDS) {
    if (!seen.has(tab)) {
      valid.push(tab)
      seen.add(tab)
    }
  }

  return valid
}




export const sanitizeSidebarHidden = (hidden?: TabId[]): TabId[] => {
  if (!Array.isArray(hidden)) return []

  const seen = new Set<TabId>()
  const sanitized: TabId[] = []

  for (const tab of hidden) {
    if (
      SIDEBAR_TAB_IDS.includes(tab as TabId) &&
      !LOCKED_SIDEBAR_TABS.includes(tab as TabId) &&
      !seen.has(tab as TabId)
    ) {
      const casted = tab as TabId
      sanitized.push(casted)
      seen.add(casted)
    }
  }

  return sanitized
}




export const getVisibleSidebarTabs = (order?: TabId[], hidden?: TabId[]): TabId[] => {
  const normalizedHidden = sanitizeSidebarHidden(hidden)
  return sanitizeSidebarOrder(order).filter((tab) => !normalizedHidden.includes(tab))
}