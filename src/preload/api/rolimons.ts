import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// ROLIMONS API
// ============================================================================

export const rolimonsApi = {
  getRolimonsItemDetails: () => invoke('get-rolimons-item-details', S.rolimonsItemDetailsSchema),
  getRolimonsPlayer: (userId: number) =>
    invoke('get-rolimons-player', S.rolimonsPlayerSchema, userId),
  getRolimonsItemPage: (itemId: number) =>
    invoke('get-rolimons-item-page', S.rolimonsItemPageSchema, itemId)
}
