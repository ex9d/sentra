import { DiscordRPCClient } from '@ryuziii/discord-rpc'
import path from 'path'
import * as fs from 'fs'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getDataFile } from '../../utils/paths'
import { gameSessionService, GameSession } from '../games/GameSessionService'

const DiscordRPC = require('discord-rpc')

const CLIENT_ID = '1466214661786439863'

export interface DiscordPresenceState {
  isEnabled: boolean
  isConnected: boolean
  currentGame: {
    name: string
    placeId: string
    thumbnailUrl?: string
  } | null
  currentTab: string | null
}

interface DiscordRPCSettings {
  enabled: boolean
}

const TAB_DISPLAY_NAMES: Record<string, string> = {
  Accounts: 'Managing Accounts',
  Profile: 'Viewing Profile',
  Friends: 'Browsing Friends',
  Groups: 'Exploring Groups',
  Games: 'Discovering Games',
  Catalog: 'Shopping Catalog',
  Inventory: 'Browsing Inventory',
  Transactions: 'Viewing Transactions',
  Logs: 'Checking Logs',
  Settings: 'Configuring Settings',
  Avatar: 'Customizing Avatar',
  Install: 'Managing Installations',
  News: 'Reading News',
  AccountSettings: 'Account Settings'
}

class DiscordRPCService {
  private client: DiscordRPCClient | null = null
  private isEnabled: boolean = false
  private isConnected: boolean = false
  private currentGame: DiscordPresenceState['currentGame'] = null
  private currentTab: string | null = null
  private startTimestamp: number | null = null
  private appStartTimestamp: number = Date.now()
  private reconnectTimeout: NodeJS.Timeout | null = null
  private updateTimeout: NodeJS.Timeout | null = null
  private settingsPath: string

  constructor() {
    // store discord settings alongside the rest of our data so macOS cleaners
    // don't accidentally wipe them
    this.settingsPath = getDataFile('discord-rpc-settings.json')
    this.loadSettings()
    this.subscribeToGameSession()

    if (this.isEnabled) {
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[DiscordRPC] Auto-connect failed:', error)
        })
      }, 3000)
    }
  }

  private subscribeToGameSession(): void {
    gameSessionService.on('game-started', (session: GameSession) => {
      this.setCurrentGame({
        name: session.name,
        placeId: session.placeId,
        thumbnailUrl: session.thumbnailUrl
      })
    })

    gameSessionService.on('game-ended', () => {
      this.clearCurrentGame()
    })
  }

  private loadSettings(): void {
    try {
      if (existsSync(this.settingsPath)) {
        const data = readFileSync(this.settingsPath, 'utf-8')
        const settings: DiscordRPCSettings = JSON.parse(data)
        this.isEnabled = settings.enabled ?? true
      } else {
        this.isEnabled = true // Default to enabled
      }
    } catch (error) {
      console.error('[DiscordRPC] Failed to load settings:', error)
      this.isEnabled = true // Default to enabled on error
    }
  }

  private saveSettings(): void {
    try {
      // ensure folder exists (macOS cleaners could delete the directory)
      const dir = path.dirname(this.settingsPath)
      if (!existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const settings: DiscordRPCSettings = { enabled: this.isEnabled }
      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2))
    } catch (error) {
      console.error('[DiscordRPC] Failed to save settings:', error)
    }
  }

  async enable(): Promise<boolean> {
    if (this.isEnabled && this.isConnected) {
      return true
    }

    this.isEnabled = true
    this.saveSettings()

    try {
      await this.connect()
      return true
    } catch (error) {
      console.error('[DiscordRPC] Failed to enable:', error)
      this.isEnabled = false
      this.saveSettings()
      return false
    }
  }

  async disable(): Promise<void> {
    this.isEnabled = false
    this.saveSettings()
    this.currentGame = null
    this.currentTab = null
    this.startTimestamp = null

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }

    await this.disconnect()
  }

  private async connect(): Promise<void> {
    if (this.client) {
      await this.disconnect()
    }

    this.client = new DiscordRPC.Client({ transport: 'ipc' })

    this.client.on('ready', () => {
      console.log('[DiscordRPC] Connected to Discord')
      this.isConnected = true
      this.updatePresence()
    })

    this.client.on('disconnected', () => {
      console.log('[DiscordRPC] Disconnected from Discord')
      this.isConnected = false
      this.scheduleReconnect()
    })

    this.client.on('error', (error: Error & { code?: string }) => {
      console.error('[DiscordRPC] Error:', error)
      this.isConnected = false
      this.scheduleReconnect()
    })

    try {
      await this.client.login({ clientId: CLIENT_ID })
    } catch (error: any) {
      console.error('[DiscordRPC] Connection failed:', error)
      this.isConnected = false
      throw error
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.clearActivity()
        this.client.destroy()
      } catch (error) {
        console.error('[DiscordRPC] Disconnect error:', error)
      }
      this.client = null
    }
    this.isConnected = false
  }

  private scheduleReconnect(): void {
    if (!this.isEnabled || this.reconnectTimeout) {
      return
    }

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null
      if (this.isEnabled && !this.isConnected) {
        console.log('[DiscordRPC] Attempting to reconnect...')
        try {
          await this.connect()
        } catch (error) {
          console.error('[DiscordRPC] Reconnection failed:', error)
          this.scheduleReconnect()
        }
      }
    }, 10000)
  }

  setCurrentTab(tabId: string | null): void {
    this.currentTab = tabId
    if (!this.currentGame) {
      this.updatePresence()
    }
  }

  private setCurrentGame(game: { name: string; placeId: string; thumbnailUrl?: string }): void {
    this.currentGame = game
    this.startTimestamp = Date.now()
    console.log('[DiscordRPC] Now playing:', game.name)
    this.updatePresence()
  }

  private clearCurrentGame(): void {
    if (this.currentGame) {
      console.log('[DiscordRPC] Clearing game activity')
      this.currentGame = null
      this.startTimestamp = null
      this.updatePresence()
    }
  }

  private updatePresence(): void {
    if (!this.client || !this.isConnected || !this.isEnabled) {
      return
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    this.updateTimeout = setTimeout(() => {
      this.updateTimeout = null
      this.doUpdatePresence()
    }, 500)
  }

  private async doUpdatePresence(): Promise<void> {
    if (!this.client || !this.isConnected || !this.isEnabled) {
      return
    }

    try {
      if (this.currentGame) {
        const activity: any = {
          details: this.currentGame.name,
          startTimestamp: this.startTimestamp ?? Date.now(),
          assets: {
            large_image: this.currentGame.thumbnailUrl || undefined,
            large_text: this.currentGame.name,
            small_image: 'sentra_icon',
            small_text: 'Launched with Sentra'
          },
          buttons: [
            {
              label: 'See game page',
              url: `https://www.roblox.com/games/${this.currentGame.placeId}`
            }
          ],
          largeImageKey: this.currentGame.thumbnailUrl || undefined,
          largeImageText: this.currentGame.name,
          smallImageKey: 'sentra_icon',
          smallImageText: 'Launched with Sentra'
        }

        console.log('[DiscordRPC] Setting game activity:', this.currentGame.name)
        await this.client.setActivity(activity)
      } else {
        const tabDisplayName = this.currentTab
          ? TAB_DISPLAY_NAMES[this.currentTab] || `Browsing ${this.currentTab}`
          : 'In the Launcher'

        const activity: any = {
          details: tabDisplayName,
          startTimestamp: this.appStartTimestamp
        }

        await this.client.setActivity(activity)
      }
    } catch (error) {
      console.error('[DiscordRPC] Failed to update presence:', error)
    }
  }

  getState(): DiscordPresenceState {
    return {
      isEnabled: this.isEnabled,
      isConnected: this.isConnected,
      currentGame: this.currentGame,
      currentTab: this.currentTab
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled
  }
}

export const discordRPCService = new DiscordRPCService()
