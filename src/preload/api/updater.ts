import { ipcRenderer } from 'electron'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'





export const updaterApi = {

  checkForUpdates: () => invoke('updater:check', S.updateStateSchema),


  downloadUpdate: () => invoke('updater:download', S.updateActionResultSchema),


  installUpdate: () => invoke('updater:install', S.updateActionResultSchema),


  getUpdaterState: () => invoke('updater:get-state', S.updateStateSchema),


  onUpdaterStatus: (callback: (state: S.UpdateState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: S.UpdateState) => {
      callback(state)
    }
    ipcRenderer.on('updater:status', handler)


    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  }
}