import { ipcRenderer } from 'electron'

export const newsApi = {
  getAnnouncements: (): Promise<any[]> =>
    ipcRenderer.invoke('news:get-announcements'),
  createAnnouncement: (
    content: string,
    username: string,
    media?: any[]
  ): Promise<any> =>
    ipcRenderer.invoke('news:create-announcement', content, username, media),
  deleteAnnouncement: (id: string): Promise<any> =>
    ipcRenderer.invoke('news:delete-announcement', id),
  updateAnnouncement: (id: string, updates: any): Promise<any> =>
    ipcRenderer.invoke('news:update-announcement', id, updates)
}

