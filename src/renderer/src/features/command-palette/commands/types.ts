import { Command, CatalogResultItem } from '../stores/useCommandPaletteStore'
import { JoinMethod, TabId } from '../../../types'
import { ModalType } from '../../../stores/useUIStore'

export interface CommandCallbacks {
  setActiveTab: (tab: TabId) => void
  openModal: (modal: ModalType) => void
  setSelectedIds: (ids: Set<string>) => void
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
  onViewProfile: (userId: string) => void
  onLaunchGame: (method: JoinMethod, target: string) => void
  onViewAccessory: (item: CatalogResultItem) => void
  getSelectedAccount: () => any
  getAccounts: () => any[]
}

export type CommandFactory = (callbacks: CommandCallbacks) => Command[]
