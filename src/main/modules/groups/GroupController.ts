import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxGroupService } from './GroupService'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from '../users/UserService'

export const registerGroupHandlers = (): void => {

  handle(
    'get-group-details',
    z.tuple([z.number(), z.string().optional()]),
    async (_, groupId, cookieRaw) => {
      const cookie = cookieRaw ? RobloxAuthService.extractCookie(cookieRaw) : undefined
      return RobloxGroupService.getGroupDetails(groupId, cookie)
    }
  )


  handle('get-batch-group-details', z.tuple([z.array(z.number())]), async (_, groupIds) => {
    return RobloxGroupService.getBatchGroupDetails(groupIds)
  })


  handle('get-group-roles', z.tuple([z.number()]), async (_, groupId) => {
    return RobloxGroupService.getGroupRoles(groupId)
  })


  handle(
    'get-group-games',
    z.tuple([z.number(), z.string().optional(), z.number().optional()]),
    async (_, groupId, cursor, limit) => {
      return RobloxGroupService.getGroupGames(groupId, cursor, limit)
    }
  )


  handle(
    'get-group-wall-posts',
    z.tuple([z.number(), z.string().optional(), z.number().optional()]),
    async (_, groupId, cursor, limit) => {
      return RobloxGroupService.getGroupWallPosts(groupId, cursor, limit)
    }
  )


  handle(
    'get-group-members',
    z.tuple([z.number(), z.string().optional(), z.number().optional(), z.number().optional()]),
    async (_, groupId, cursor, limit, roleId) => {
      return RobloxGroupService.getGroupMembers(groupId, cursor, limit, roleId)
    }
  )


  handle('get-user-groups-full', z.tuple([z.number()]), async (_, userId) => {
    return RobloxGroupService.getUserGroups(userId)
  })


  handle('get-pending-group-requests', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxGroupService.getPendingGroupRequests(cookie)
  })


  handle(
    'get-group-social-links',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, groupId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxGroupService.getGroupSocialLinks(cookie, groupId)
    }
  )


  handle('get-group-thumbnails', z.tuple([z.array(z.number())]), async (_, groupIds) => {
    const thumbnailMap = await RobloxGroupService.getGroupThumbnails(groupIds)

    const result: Record<number, string> = {}
    thumbnailMap.forEach((url, id) => {
      result[id] = url
    })
    return result
  })


  handle(
    'cancel-pending-group-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, groupId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxGroupService.cancelPendingRequest(cookie, groupId)
    }
  )


  handle('leave-group', z.tuple([z.string(), z.number()]), async (_, cookieRaw, groupId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)

    const userData = await RobloxUserService.getAuthenticatedUser(cookie)
    return RobloxGroupService.leaveGroup(cookie, groupId, userData.id)
  })


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