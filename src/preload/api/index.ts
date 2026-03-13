// Consolidated Preload API modules - grouped by domain
export { invoke } from './invoke'

// User domain (accounts, users, friends)
export { accountApi, usersApi, friendsApi } from './user'

// Avatar domain (avatar, inventory, catalog, catalog database)
export { avatarApi, inventoryApi, catalogApi, catalogDatabaseApi } from './avatar'

// Games domain (games, groups)
export { gamesApi, groupsApi } from './games'

// System domain (system, pin, install, netlog, catalogDb, app)
export { systemApi, licenseApi, pinApi, installApi, netlogApi, catalogDbApi, appApi } from './system'

// Auth
export { authApi } from './auth'

// External APIs
export { rolimonsApi } from './rolimons'

// Transactions
export { transactionsApi } from './transactions'

// Updater
export { updaterApi } from './updater'

// News
export { newsApi } from './news'

// Account Settings
export { accountSettingsApi } from './accountSettings'

// Discord RPC
export { discordRPCApi } from './discordRPC'

// Watcher
export { watcherApi } from './watcher'
