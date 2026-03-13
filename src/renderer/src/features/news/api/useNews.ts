import { useQuery } from '@tanstack/react-query'
import { NewsPost } from '../types'

// Define the announcement response type
interface Announcement {
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

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const mapAnnouncementToNewsPost = (announcement: Announcement): NewsPost => {
  return {
    id: announcement.id,
    author: {
      name: announcement.createdBy,
      handle: announcement.createdBy.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl: `https://unavatar.io/github/${announcement.createdBy}`,
      verified: false
    },
    content: announcement.content,
    timestamp: formatTimeAgo(announcement.createdAt),
    createdAt: announcement.createdAt,
    media: announcement.media
  }
}

export const useNews = () => {
  return useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const data: Announcement[] = await window.api.news.getAnnouncements()
      return data.map(mapAnnouncementToNewsPost)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  })
}

