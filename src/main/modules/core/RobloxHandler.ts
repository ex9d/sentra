import { registerAuthHandlers } from '../auth/AuthController'
import { registerUserHandlers } from '../users/UserController'
import { registerFriendHandlers } from '../friends/FriendController'
import { registerGameHandlers } from '../games/GameController'
import { registerAvatarHandlers } from '../avatar/AvatarController'
import { registerInstallHandlers } from '../install/InstallController'
import { registerCatalogHandlers } from '../catalog/CatalogController'
import { registerCatalogDatabaseHandlers } from '../catalog/CatalogDatabaseController'
import { registerGroupHandlers } from '../groups/GroupController'
import { registerTransactionHandlers } from '../transactions/TransactionController'
import { registerAccountSettingsHandlers } from '../accountSettings/AccountSettingsController'





export const registerRobloxHandlers = (): void => {
  registerAuthHandlers()
  registerUserHandlers()
  registerFriendHandlers()
  registerGameHandlers()
  registerAvatarHandlers()
  registerInstallHandlers()
  registerCatalogHandlers()
  registerCatalogDatabaseHandlers()
  registerGroupHandlers()
  registerTransactionHandlers()
  registerAccountSettingsHandlers()
}