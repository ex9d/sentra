import { requestWithCsrf } from '@main/lib/request'
import { z } from 'zod'
import { wearingAssetsResultSchema } from '@shared/ipc-schemas/avatar'
import { BODY_COLOR_BASE_KEYS } from './utils/bodyColorUtils'

export class RobloxAvatarMutationService {






  static async setWearingAssets(
    cookie: string,
    assets: Array<{
      id: number
      name: string
      assetType: { id: number; name: string }
      currentVersionId?: number
      meta?: { order?: number; puffiness?: number; version?: number }
    }>
  ) {

    const assetsPayload = assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      assetType: {
        id: asset.assetType.id,
        name: asset.assetType.name
      },
      ...(asset.currentVersionId ? { currentVersionId: asset.currentVersionId } : {}),
      ...(asset.meta ? { meta: asset.meta } : {})
    }))

    const requestBody = { assets: assetsPayload }

    const response = await requestWithCsrf(wearingAssetsResultSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v2/avatar/set-wearing-assets',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    })

    return response
  }





  static async setWearingAssetsLegacy(cookie: string, assetIds: number[]) {
    return requestWithCsrf(wearingAssetsResultSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v1/avatar/set-wearing-assets',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        assetIds
      }
    })
  }

  static async setBodyColors(cookie: string, bodyColors: any) {

    const payload: Record<string, string> = {}

    for (const baseKey of BODY_COLOR_BASE_KEYS) {
      const color3Key = `${baseKey}3`


      let hexColor: string | undefined


      if (typeof bodyColors[color3Key] === 'string') {
        hexColor = bodyColors[color3Key]
      } else if (typeof bodyColors[baseKey] === 'string') {
        hexColor = bodyColors[baseKey]
      }

      if (hexColor) {

        payload[color3Key] = hexColor.replace('#', '').toLowerCase()
      }
    }


    const finalPayload = Object.keys(payload).length > 0 ? payload : bodyColors


    return this.postAvatarMutation(cookie, '/v2/avatar/set-body-colors', finalPayload)
  }







  static async setAvatarScales(
    cookie: string,
    scales: {
      height: number
      width: number
      head: number
      proportion: number
      bodyType: number
    }
  ) {
    return this.postAvatarMutation(cookie, '/v1/avatar/set-scales', scales)
  }







  static async setPlayerAvatarType(cookie: string, playerAvatarType: 'R6' | 'R15') {
    return this.postAvatarMutation(cookie, '/v1/avatar/set-player-avatar-type', {
      playerAvatarType
    })
  }

  private static postAvatarMutation(
    cookie: string,
    path: string,
    body: Record<string, unknown>
  ): Promise<any> {

    return requestWithCsrf(z.object({ success: z.boolean() }), {
      method: 'POST',
      url: `https:
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }
}