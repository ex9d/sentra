import { request } from '@main/lib/request'
import { z } from 'zod'
import {
  groupDetailsSchema,
  groupRolesResponseSchema,
  groupGamesResponseSchema,
  userGroupMembershipSchema,
  pendingGroupRequestRawSchema,
  groupSocialLinkSchema,
  groupWallPostsResponseSchema,
  groupMembersResponseSchema,
  groupRoleMembersResponseSchema,
  groupStoreResponseSchema,
  type PendingGroupRequestRaw
} from '@shared/ipc-schemas/games'

export class RobloxGroupService {
  /**
   * Get detailed info about a specific group
   */
  static async getGroupDetails(groupId: number, cookie?: string) {
    const result = await request(groupDetailsSchema, {
      url: `https://groups.roblox.com/v1/groups/${groupId}`,
      cookie
    })
    return result
  }

  /**
   * Get batch group details using V2 API
   */
  static async getBatchGroupDetails(groupIds: number[]) {
    if (groupIds.length === 0) return []

    const responseSchema = z.object({
      data: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string().nullable().optional(),
          owner: z
            .object({
              id: z.number(),
              type: z.string()
            })
            .nullable()
            .optional(),
          created: z.string().optional(),
          hasVerifiedBadge: z.boolean().optional()
        })
      )
    })

    const result = await request(responseSchema, {
      url: `https://groups.roblox.com/v2/groups?groupIds=${groupIds.join(',')}`
    })

    return result.data
  }

  /**
   * Get all roles in a group
   */
  static async getGroupRoles(groupId: number) {
    return request(groupRolesResponseSchema, {
      url: `https://groups.roblox.com/v1/groups/${groupId}/roles`
    })
  }

  /**
   * Get games created by a group
   */
  static async getGroupGames(groupId: number, cursor?: string, limit: number = 50) {
    const queryParams = new URLSearchParams({
      accessFilter: 'Public',
      limit: limit.toString(),
      sortOrder: 'Desc'
    })
    if (cursor) queryParams.append('cursor', cursor)

    return request(groupGamesResponseSchema, {
      url: `https://games.roblox.com/v2/groups/${groupId}/gamesV2?${queryParams.toString()}`
    })
  }

  /**
   * Get group wall posts
   */
  static async getGroupWallPosts(groupId: number, cursor?: string, limit: number = 10) {
    const queryParams = new URLSearchParams({
      sortOrder: 'Desc',
      limit: limit.toString()
    })
    if (cursor) queryParams.append('cursor', cursor)

    return request(groupWallPostsResponseSchema, {
      url: `https://groups.roblox.com/v2/groups/${groupId}/wall/posts?${queryParams.toString()}`
    })
  }

  /**
   * Get group members
   */
  static async getGroupMembers(
    groupId: number,
    cursor?: string,
    limit: number = 10,
    roleId?: number
  ) {
    const queryParams = new URLSearchParams({
      sortOrder: 'Desc',
      limit: limit.toString()
    })
    if (cursor) queryParams.append('cursor', cursor)

    if (roleId) {
      const url = `https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?${queryParams.toString()}`
      return request(groupRoleMembersResponseSchema, { url })
    }

    const url = `https://groups.roblox.com/v1/groups/${groupId}/users?${queryParams.toString()}`
    return request(groupMembersResponseSchema, { url })
  }

  /**
   * Get all groups a user has joined
   */
  static async getUserGroups(userId: number) {
    const responseSchema = z.object({
      data: z.array(userGroupMembershipSchema)
    })

    const result = await request(responseSchema, {
      url: `https://groups.roblox.com/v1/users/${userId}/groups/roles`
    })

    return result.data
  }

  /**
   * Get pending group join requests for the authenticated user
   */
  static async getPendingGroupRequests(cookie: string) {
    // The API returns flat group data, not nested under 'group'
    const responseSchema = z.object({
      data: z.array(pendingGroupRequestRawSchema)
    })

    const result = await request(responseSchema, {
      url: 'https://groups.roblox.com/v1/user/groups/pending',
      cookie
    })

    // Transform to the expected format with 'group' wrapper
    return result.data.map((item: PendingGroupRequestRaw) => ({
      group: {
        id: item.id,
        name: item.name,
        description: item.description,
        owner: item.owner,
        memberCount: item.memberCount,
        hasVerifiedBadge: item.hasVerifiedBadge
      },
      created: item.created
    }))
  }

  /**
   * Get group social links
   */
  static async getGroupSocialLinks(cookie: string, groupId: number) {
    const responseSchema = z.object({
      data: z.array(groupSocialLinkSchema)
    })

    const result = await request(responseSchema, {
      url: `https://groups.roblox.com/v1/groups/${groupId}/social-links`,
      cookie
    })

    return result.data
  }

  /**
   * Get group icon/thumbnail
   */
  static async getGroupThumbnails(groupIds: number[]) {
    if (groupIds.length === 0) return new Map<number, string>()

    const thumbnailSchema = z.object({
      data: z.array(
        z.object({
          targetId: z.number(),
          state: z.string(),
          imageUrl: z.string().nullable().optional()
        })
      )
    })

    const result = await request(thumbnailSchema, {
      url: `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupIds.join(',')}&size=420x420&format=Png&isCircular=false`
    })

    const thumbnailMap = new Map<number, string>()
    result.data.forEach((item) => {
      if (item.state === 'Completed' && item.imageUrl) {
        thumbnailMap.set(item.targetId, item.imageUrl)
      }
    })

    return thumbnailMap
  }

  /**
   * Get user's role in a specific group
   */
  static async getUserRoleInGroup(userId: number, groupId: number) {
    const responseSchema = z.object({
      groupId: z.number(),
      role: z
        .object({
          id: z.number(),
          name: z.string(),
          rank: z.number()
        })
        .nullable()
    })

    try {
      const result = await request(responseSchema, {
        url: `https://groups.roblox.com/v1/users/${userId}/groups/roles?groupIds=${groupId}`
      })
      return result.role
    } catch {
      return null
    }
  }

  /**
   * Cancel a pending group join request
   */
  static async cancelPendingRequest(cookie: string, groupId: number) {
    const { requestWithCsrf } = await import('@main/lib/request')

    await requestWithCsrf(z.object({}).passthrough(), {
      method: 'DELETE',
      url: `https://groups.roblox.com/v1/groups/${groupId}/join-requests/users`,
      cookie
    })

    return { success: true }
  }

  /**
   * Leave a group
   */
  static async leaveGroup(cookie: string, groupId: number, userId: number) {
    const { requestWithCsrf } = await import('@main/lib/request')

    await requestWithCsrf(z.object({}).passthrough(), {
      method: 'DELETE',
      url: `https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`,
      cookie
    })

    return { success: true }
  }

  /**
   * Search group store items
   */
  static async searchGroupStore(
    groupId: number,
    keyword?: string,
    cursor?: string,
    limit: number = 60,
    cookie?: string
  ) {
    const queryParams = new URLSearchParams({
      category: 'All',
      creatorTargetId: groupId.toString(),
      creatorType: 'Group',
      limit: limit.toString(),
      sortOrder: 'Desc',
      sortType: 'Updated'
    })
    if (cursor) queryParams.append('cursor', cursor)
    if (keyword) queryParams.append('keyword', keyword)

    return request(groupStoreResponseSchema, {
      url: `https://catalog.roblox.com/v2/search/items/details?${queryParams.toString()}`,
      cookie
    })
  }
}
