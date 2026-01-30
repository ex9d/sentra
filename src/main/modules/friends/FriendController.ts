import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxFriendService } from './FriendService'
import { RobloxUserService } from '../users/UserService'

/**
 * Registers friend-related IPC handlers
 */
export const registerFriendHandlers = (): void => {
  handle(
    'get-friends',
    z.tuple([z.string(), z.number().optional(), z.boolean().optional()]),
    async (_, cookieRaw, targetUserId, forceRefresh) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      // If targetUserId is provided, use it. Otherwise, use the authenticated user's ID.
      const userId = targetUserId || (await RobloxUserService.getAuthenticatedUser(cookie)).id
      return RobloxFriendService.getFriends(cookie, userId, forceRefresh || false)
    }
  )

  handle(
    'get-friends-paged',
    z.tuple([z.string(), z.number(), z.string().optional()]),
    async (_, cookieRaw, targetUserId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.getFriendsPaged(cookie, targetUserId, cursor)
    }
  )

  handle(
    'get-followers',
    z.tuple([z.string(), z.number(), z.string().optional()]),
    async (_, cookieRaw, targetUserId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.getFollowers(cookie, targetUserId, cursor)
    }
  )

  handle(
    'get-followings',
    z.tuple([z.string(), z.number(), z.string().optional()]),
    async (_, cookieRaw, targetUserId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.getFollowings(cookie, targetUserId, cursor)
    }
  )

  handle('fetch-friend-stats', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // userId is passed explicitly for the friend we want to check
    return RobloxFriendService.getFriendStats(cookie, userId)
  })

  handle(
    'send-friend-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, targetUserId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.sendFriendRequest(cookie, targetUserId)
    }
  )

  handle('get-friend-requests', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // getFriendRequests doesn't need userId - the endpoint uses the authenticated user from the cookie
    return RobloxFriendService.getFriendRequests(cookie)
  })

  handle(
    'accept-friend-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, requesterUserId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.acceptFriendRequest(cookie, requesterUserId)
    }
  )

  handle(
    'decline-friend-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, requesterUserId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.declineFriendRequest(cookie, requesterUserId)
    }
  )

  handle('unfriend', z.tuple([z.string(), z.number()]), async (_, cookieRaw, targetUserId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxFriendService.unfriend(cookie, targetUserId)
  })
}
