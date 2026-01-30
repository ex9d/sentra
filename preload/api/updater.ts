import { ipcRenderer } from 'electron'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// UPDATER API
// ============================================================================

export const updaterApi = {
  // Check for updates
  checkForUpdates: () => invoke('updater:check', S.updateStateSchema),

  // Download available update
  downloadUpdate: () => invoke('updater:download', S.updateActionResultSchema),

  // Quit and install the downloaded update
  installUpdate: () => invoke('updater:install', S.updateActionResultSchema),

  // Get current updater state
  getUpdaterState: () => invoke('updater:get-state', S.updateStateSchema),

  // Listen for updater status changes
  onUpdaterStatus: (callback: (state: S.UpdateState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: S.UpdateState) => {
      callback(state)
    }
    ipcRenderer.on('updater:status', handler)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  }
}
