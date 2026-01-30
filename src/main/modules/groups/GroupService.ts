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



  static async getGroupDetails(groupId: number, cookie?: string) {
    const result = await request(groupDetailsSchema, {
      url: `https:
      cookie
    })
    return result
  }




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
      url: `https:
    })

    return result.data
  }




  static async getGroupRoles(groupId: number) {
    return request(groupRolesResponseSchema, {
      url: `https:
    })
  }




  static async getGroupGames(groupId: number, cursor?: string, limit: number = 50) {
    const queryParams = new URLSearchParams({
      accessFilter: 'Public',
      limit: limit.toString(),
      sortOrder: 'Desc'
    })
    if (cursor) queryParams.append('cursor', cursor)

    return request(groupGamesResponseSchema, {
      url: `https:
    })
  }




  static async getGroupWallPosts(groupId: number, cursor?: string, limit: number = 10) {
    const queryParams = new URLSearchParams({
      sortOrder: 'Desc',
      limit: limit.toString()
    })
    if (cursor) queryParams.append('cursor', cursor)

    return request(groupWallPostsResponseSchema, {
      url: `https:
    })
  }




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
      const url = `https:
      return request(groupRoleMembersResponseSchema, { url })
    }

    const url = `https:
    return request(groupMembersResponseSchema, { url })
  }




  static async getUserGroups(userId: number) {
    const responseSchema = z.object({
      data: z.array(userGroupMembershipSchema)
    })

    const result = await request(responseSchema, {
      url: `https:
    })

    return result.data
  }




  static async getPendingGroupRequests(cookie: string) {

    const responseSchema = z.object({
      data: z.array(pendingGroupRequestRawSchema)
    })

    const result = await request(responseSchema, {
      url: 'https://groups.roblox.com/v1/user/groups/pending',
      cookie
    })


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




  static async getGroupSocialLinks(cookie: string, groupId: number) {
    const responseSchema = z.object({
      data: z.array(groupSocialLinkSchema)
    })

    const result = await request(responseSchema, {
      url: `https:
      cookie
    })

    return result.data
  }




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
      url: `https:
    })

    const thumbnailMap = new Map<number, string>()
    result.data.forEach((item) => {
      if (item.state === 'Completed' && item.imageUrl) {
        thumbnailMap.set(item.targetId, item.imageUrl)
      }
    })

    return thumbnailMap
  }




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
        url: `https:
      })
      return result.role
    } catch {
      return null
    }
  }




  static async cancelPendingRequest(cookie: string, groupId: number) {
    const { requestWithCsrf } = await import('@main/lib/request')

    await requestWithCsrf(z.object({}).passthrough(), {
      method: 'DELETE',
      url: `https:
      cookie
    })

    return { success: true }
  }




  static async leaveGroup(cookie: string, groupId: number, userId: number) {
    const { requestWithCsrf } = await import('@main/lib/request')

    await requestWithCsrf(z.object({}).passthrough(), {
      method: 'DELETE',
      url: `https:
      cookie
    })

    return { success: true }
  }




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
      url: `https:
      cookie
    })
  }
}