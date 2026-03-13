import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

export interface Announcement {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  createdBy: string
  media?: Array<{
    type: 'image' | 'video'
    url: string
    alt?: string
  }>
}

export class AnnouncementService {
  private announcementsPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.announcementsPath = path.join(userDataPath, 'announcements.json')
  }

  private ensureFile(): void {
    if (!fs.existsSync(this.announcementsPath)) {
      fs.writeFileSync(this.announcementsPath, JSON.stringify([]), 'utf-8')
    }
  }

  private readAnnouncements(): Announcement[] {
    try {
      this.ensureFile()
      const data = fs.readFileSync(this.announcementsPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading announcements:', error)
      return []
    }
  }

  private writeAnnouncements(announcements: Announcement[]): void {
    try {
      fs.writeFileSync(this.announcementsPath, JSON.stringify(announcements, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error writing announcements:', error)
      throw error
    }
  }

  getAnnouncements(): Announcement[] {
    return this.readAnnouncements()
  }

  createAnnouncement(
    content: string,
    createdBy: string,
    media?: Announcement['media']
  ): Announcement {
    const announcements = this.readAnnouncements()
    const now = new Date().toISOString()

    const announcement: Announcement = {
      id: uuidv4(),
      content,
      createdAt: now,
      updatedAt: now,
      createdBy,
      media
    }

    announcements.unshift(announcement) // Add to beginning for chronological order
    this.writeAnnouncements(announcements)

    return announcement
  }

  deleteAnnouncement(id: string): boolean {
    const announcements = this.readAnnouncements()
    const filtered = announcements.filter((a) => a.id !== id)

    if (filtered.length === announcements.length) {
      return false // Announcement not found
    }

    this.writeAnnouncements(filtered)
    return true
  }

  updateAnnouncement(
    id: string,
    updates: Partial<Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>>
  ): Announcement | null {
    const announcements = this.readAnnouncements()
    const index = announcements.findIndex((a) => a.id === id)

    if (index === -1) {
      return null
    }

    announcements[index] = {
      ...announcements[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.writeAnnouncements(announcements)
    return announcements[index]
  }
}

export const announcementService = new AnnouncementService()
