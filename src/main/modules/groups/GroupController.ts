import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxGroupService } from './GroupService'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from '../users/UserService'

export const registerGroupHandlers = (): void => {
  // Get detailed info about a specific group
  handle(
    'get-group-details',
    z.tuple([z.number(), z.string().optional()]),
    async (_, groupId, cookieRaw) => {
      const cookie = cookieRaw ? RobloxAuthService.extractCookie(cookieRaw) : undefined
      return RobloxGroupService.getGroupDetails(groupId, cookie)
    }
  )

  // Get batch group details using V2 API
  handle('get-batch-group-details', z.tuple([z.array(z.number())]), async (_, groupIds) => {
    return RobloxGroupService.getBatchGroupDetails(groupIds)
  })

  // Get all roles in a group
  handle('get-group-roles', z.tuple([z.number()]), async (_, groupId) => {
    return RobloxGroupService.getGroupRoles(groupId)
  })

  // Get games created by a group
  handle(
    'get-group-games',
    z.tuple([z.number(), z.string().optional(), z.number().optional()]),
    async (_, groupId, cursor, limit) => {
      return RobloxGroupService.getGroupGames(groupId, cursor, limit)
    }
  )

  // Get group wall posts
  handle(
    'get-group-wall-posts',
    z.tuple([z.number(), z.string().optional(), z.number().optional()]),
    async (_, groupId, cursor, limit) => {
      return RobloxGroupService.getGroupWallPosts(groupId, cursor, limit)
    }
  )

  // Get group members
  handle(
    'get-group-members',
    z.tuple([z.number(), z.string().optional(), z.number().optional(), z.number().optional()]),
    async (_, groupId, cursor, limit, roleId) => {
      return RobloxGroupService.getGroupMembers(groupId, cursor, limit, roleId)
    }
  )

  // Get all groups a user has joined
  handle('get-user-groups-full', z.tuple([z.number()]), async (_, userId) => {
    return RobloxGroupService.getUserGroups(userId)
  })

  // Get pending group join requests for the authenticated user
  handle('get-pending-group-requests', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxGroupService.getPendingGroupRequests(cookie)
  })

  // Get group social links
  handle(
    'get-group-social-links',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, groupId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxGroupService.getGroupSocialLinks(cookie, groupId)
    }
  )

  // Get group thumbnails
  handle('get-group-thumbnails', z.tuple([z.array(z.number())]), async (_, groupIds) => {
    const thumbnailMap = await RobloxGroupService.getGroupThumbnails(groupIds)
    // Convert Map to object for IPC serialization
    const result: Record<number, string> = {}
    thumbnailMap.forEach((url, id) => {
      result[id] = url
    })
    return result
  })

  // Cancel a pending group join request
  handle(
    'cancel-pending-group-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, groupId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxGroupService.cancelPendingRequest(cookie, groupId)
    }
  )

  // Leave a group
  handle('leave-group', z.tuple([z.string(), z.number()]), async (_, cookieRaw, groupId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // Get the authenticated user's ID
    const userData = await RobloxUserService.getAuthenticatedUser(cookie)
    return RobloxGroupService.leaveGroup(cookie, groupId, userData.id)
  })

  // Search group store items
  handle(
    'search-group-store',
    z.tuple([
      z.number(),
      z.string().optional(),
      z.string().optional(),
      z.number().optional(),
      z.string().optional()
    ]),
    async (_, groupId, keyword, cursor, limit, cookie) => {
      return RobloxGroupService.searchGroupStore(groupId, keyword, cursor, limit, cookie)
    }
  )
}
