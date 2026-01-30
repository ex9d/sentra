import { Command } from '../stores/useCommandPaletteStore'
import { CommandCallbacks } from './types'
import { createNavigationCommands } from './navigationCommands'
import { createAccountsCommands, createAccountSwitchCommands } from './accountsCommands'
import { createGamesCommands } from './gamesCommands'
import { createProfilesCommands } from './profilesCommands'
import { createSocialCommands } from './socialCommands'
import { createActionsCommands } from './actionsCommands'
import { createValuesCommands } from './valuesCommands'
import { createCatalogCommands } from './catalogCommands'

export const createAllCommands = (callbacks: CommandCallbacks): Command[] => {
  return [
    ...createNavigationCommands(callbacks),
    ...createAccountsCommands(callbacks),
    ...createAccountSwitchCommands(callbacks),
    ...createGamesCommands(callbacks),
    ...createProfilesCommands(callbacks),
    ...createSocialCommands(callbacks),
    ...createActionsCommands(callbacks),
    ...createValuesCommands(callbacks),
    ...createCatalogCommands(callbacks)
  ]
}

export * from './types'
export * from './navigationCommands'
export * from './accountsCommands'
export * from './gamesCommands'
export * from './profilesCommands'
export * from './socialCommands'
export * from './actionsCommands'
export * from './valuesCommands'
export * from './catalogCommands'
