import { ipcMain } from 'electron'
import { net } from 'electron'
import { announcementService } from './AnnouncementService'

export function registerNewsHandlers(): void {
  // Get announcements (remote github sync only)
  ipcMain.handle('news:get-announcements', async () => {
    try {
      console.log('[News] Starting news fetch process...')
      
      // attempt to fetch remote news.js from installer repo
      const url =
        'https://raw.githubusercontent.com/sashaga2a24/installer/main/news.js'
      console.log('[News] Fetching from URL:', url)
      
      try {
        console.log('[News] Creating fetch request...')
        const resp = await net.fetch(url)
        console.log('[News] Fetch completed, status:', resp.status, 'OK:', resp.ok)
        
        if (resp.ok) {
          console.log('[News] Response is OK, reading text...')
          const text = await resp.text()
          console.log('[News] Text read successfully, length:', text.length)
          console.log('[News] Text preview:', text.substring(0, Math.min(200, text.length)))
          
          const remote = parseRemoteNewsJs(text)
          console.log('[News] Parsed result:', Array.isArray(remote) ? remote.length : 'not array', 'items')
          
          if (Array.isArray(remote) && remote.length) {
            console.log('[News] Successfully fetched', remote.length, 'announcements from GitHub')

            // Sort by creation date descending (newest first)
            return remote.sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          } else {
            console.warn('[News] GitHub response not an array or empty')
          }
        } else {
          console.warn('[News] GitHub fetch failed with status:', resp.status)
        }
      } catch (err) {
        console.error('[News] Failed to sync news from GitHub:', err)
        if (err instanceof Error) {
          console.error('[News] Error details:', err.message, err.stack)
        } else {
          console.error('[News] Error details:', String(err))
        }
      }

      console.log('[News] No news available, returning empty array')
      return []
    } catch (error) {
      console.error('[News] Error getting announcements:', error)
      throw error
    }
  })

  // Helper to interpret JS file contents exported via module.exports
  function parseRemoteNewsJs(text: string): any[] {
    try {
      // 1. Remove the "module.exports =" part more reliably
      const cleanText = text.replace(/module\.exports\s*=\s*/, '').trim()
      
      // 2. Remove any trailing semicolon if it exists
      const script = cleanText.replace(/;$/, '')

      // 3. Use a safer Function constructor to parse the JS Object
      // This handles your single quotes, double quotes, and unquoted keys automatically
      const parsed = new Function(`return ${script}`)()

      if (Array.isArray(parsed)) {
        console.log('[News] Parsed remote news from GitHub, items:', parsed.length)
        return parsed
      }
    } catch (e) {
      console.error('[News] Parsing failed:', e)
    }
    return []
  }

  // Create announcement
  ipcMain.handle(
    'news:create-announcement',
    async (_event, content: string, username: string, media?: any[]) => {
      try {
        return announcementService.createAnnouncement(content, username, media)
      } catch (error) {
        console.error('Error creating announcement:', error)
        throw error
      }
    }
  )

  // Delete announcement (admin only)
  ipcMain.handle('news:delete-announcement', (_event, id: string) => {
    try {
      const success = announcementService.deleteAnnouncement(id)
      return { success }
    } catch (error) {
      console.error('Error deleting announcement:', error)
      throw error
    }
  })

  // Update announcement (admin only)
  ipcMain.handle('news:update-announcement', (_event, id: string, updates: any) => {
    try {
      const result = announcementService.updateAnnouncement(id, updates)
      if (!result) {
        throw new Error('Announcement not found')
      }
      return result
    } catch (error) {
      console.error('Error updating announcement:', error)
      throw error
    }
  })
}

