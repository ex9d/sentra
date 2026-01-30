import { CommandFactory } from './types'

export const createActionsCommands: CommandFactory = (callbacks) => [
  {
    id: 'action-add-account',
    label: 'Add Account',
    description: 'Add a new Roblox account',
    icon: 'user-plus',
    category: 'actions',
    action: () => callbacks.openModal('addAccount')
  },
  {
    id: 'action-launch',
    label: 'Open Launch Modal',
    description: 'Configure and launch game',
    icon: 'play',
    category: 'actions',
    action: () => callbacks.openModal('join')
  }
]
