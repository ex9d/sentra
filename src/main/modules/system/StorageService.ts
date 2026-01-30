import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import {
  Account,
  DEFAULT_ACCENT_COLOR,
  TabId,
  ThemePreference,
  TintPreference
} from '../../../renderer/src/types'
import { MultiInstance } from '@main/lib/MultiInstance'
import { z } from 'zod'
import { favoriteItemSchema } from '../../../shared/ipc-schemas/avatar'
import { pinService } from './PinService'
import {
  sanitizeSidebarHidden,
  sanitizeSidebarOrder,
  SIDEBAR_TAB_IDS
} from '../../../shared/navigation'
import * as crypto from 'crypto'

const customFontSchema = z.object({
  family: z.string(),
  url: z.string()
})

const sidebarTabIdEnum = z.enum(SIDEBAR_TAB_IDS)
const themePreferenceEnum = z.enum(['system', 'dark', 'light'])
const tintPreferenceEnum = z.enum(['neutral', 'cool'])

const storeDataSchema = z.object({
  sidebarWidth: z.number().optional(),
  sidebarCollapsed: z.boolean().optional(),
  accountsViewMode: z.enum(['list', 'grid']).optional(),
  avatarRenderWidth: z.number().optional(),
  windowWidth: z.number().optional(),
  windowHeight: z.number().optional(),

  encryptedAccounts: z.string().optional(),
  favoriteGames: z.array(z.string()).optional(),
  favoriteItems: z.array(favoriteItemSchema).optional(),
  excludeFullGames: z.boolean().optional(),
  customFonts: z.array(customFontSchema).optional(),
  activeFont: z.string().nullable().optional(),
  settings: z
    .object({
      primaryAccountId: z.string().nullable().optional(),
      allowMultipleInstances: z.boolean().optional(),
      defaultInstallationPath: z.string().nullable().optional(),
      accentColor: z.string().optional(),
      useDynamicAccentColor: z.boolean().optional(),
      theme: themePreferenceEnum.optional(),
      tint: tintPreferenceEnum.optional(),
      privacyMode: z.boolean().optional(),
      showSidebarProfileCard: z.boolean().optional(),
      sidebarTabOrder: z.array(sidebarTabIdEnum).optional(),
      sidebarHiddenTabs: z.array(sidebarTabIdEnum).optional(),

      pinCodeHash: z.string().nullable().optional()
    })
    .optional()
})

type StoreData = z.infer<typeof storeDataSchema>

class StorageService {
  private path: string
  private data: StoreData = {}
  private decryptedAccounts: Account[] | null = null
  private currentVerifiedPin: string | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.path = join(userDataPath, 'config.json')
    this.init()
  }

  private init(): void {
    try {
      if (!existsSync(this.path)) {
        const dir = app.getPath('userData')
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        this.save()
      } else {
        this.load()
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error)
    }
  }

  private load(): void {
    try {
      const fileContent = readFileSync(this.path, 'utf-8')
      const rawData = JSON.parse(fileContent)
      const result = storeDataSchema.safeParse(rawData)

      if (result.success) {
        this.data = result.data
        this.migratePin()
      } else {
        console.error('Storage validation failed:', result.error)
        try {
          const backupPath = this.path + '.bak'
          writeFileSync(backupPath, fileContent)
        } catch (e) {
          console.error('Failed to backup config:', e)
        }
        this.data = {}
      }


      if (process.platform !== 'win32') {
        if (this.data.settings) {
          this.data.settings.allowMultipleInstances = false
        }
      }

      if (this.data.settings?.allowMultipleInstances) {
        MultiInstance.Enable()
      } else {
        MultiInstance.Disable()
      }
    } catch (error) {
      console.error('Failed to load storage:', error)
      this.data = {}
    }
  }

  private migratePin(): void {

    if (this.data.settings && 'pinCode' in this.data.settings) {
      delete (this.data.settings as any).pinCode
      this.save()
    }
  }

  private save(): void {
    try {
      writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Failed to save storage:', error)
    }
  }




  private encryptAccountsWithPin(accounts: Account[], pin: string): string | null {
    try {

      const salt = crypto.randomBytes(16)
      const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256')


      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)


      const plaintext = JSON.stringify(accounts)
      let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
      encrypted += cipher.final('hex')


      const authTag = cipher.getAuthTag()


      const combined = salt.toString('hex') + iv.toString('hex') + authTag.toString('hex') + encrypted

      return combined
    } catch (error) {
      console.error('Failed to encrypt accounts:', error)
      return null
    }
  }




  private decryptAccountsWithPin(encryptedData: string, pin: string): Account[] | null {
    try {

      const salt = Buffer.from(encryptedData.substring(0, 32), 'hex')
      const iv = Buffer.from(encryptedData.substring(32, 56), 'hex')
      const authTag = Buffer.from(encryptedData.substring(56, 88), 'hex')
      const encrypted = encryptedData.substring(88)


      const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256')


      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)

      let plaintext = decipher.update(encrypted, 'hex', 'utf-8')
      plaintext += decipher.final('utf-8')

      const accounts = JSON.parse(plaintext)
      return Array.isArray(accounts) ? accounts : null
    } catch (error) {
      console.error('Failed to decrypt accounts:', error)
      return null
    }
  }

  public getSidebarWidth(): number | undefined {
    return this.data.sidebarWidth
  }

  public setSidebarWidth(width: number): void {
    this.data.sidebarWidth = width
    this.save()
  }

  public getSidebarCollapsed(): boolean {
    return this.data.sidebarCollapsed ?? false
  }

  public setSidebarCollapsed(collapsed: boolean): void {
    this.data.sidebarCollapsed = collapsed
    this.save()
  }

  public getAccountsViewMode(): 'list' | 'grid' {
    return this.data.accountsViewMode ?? 'list'
  }

  public setAccountsViewMode(mode: 'list' | 'grid'): void {
    this.data.accountsViewMode = mode
    this.save()
  }




  public getAccounts(): Account[] {
    const pinHash = this.getPinHash()


    if (pinHash && !pinService.isPinCurrentlyVerified()) {
      return []
    }


    if (this.decryptedAccounts === null && this.data.encryptedAccounts) {
      if (this.currentVerifiedPin) {
        this.decryptedAccounts = this.decryptAccountsWithPin(
          this.data.encryptedAccounts,
          this.currentVerifiedPin
        ) || []
      } else {
        return []
      }
    }

    return this.decryptedAccounts || []
  }




  public setAccounts(accounts: Account[]): void {
    const pinHash = this.getPinHash()

    if (pinHash && !pinService.isPinCurrentlyVerified()) {
      console.error('PIN must be verified before saving accounts')
      return
    }

    if (!this.currentVerifiedPin && pinHash) {
      console.error('PIN verification required')
      return
    }


    if (this.currentVerifiedPin && pinHash) {
      const encrypted = this.encryptAccountsWithPin(accounts, this.currentVerifiedPin)
      if (encrypted) {
        this.data.encryptedAccounts = encrypted
        this.decryptedAccounts = accounts
        this.save()
      } else {
        console.error('Failed to encrypt accounts')
      }
    } else {

      this.data.encryptedAccounts = JSON.stringify(accounts)
      this.decryptedAccounts = accounts
      this.save()
    }
  }

  public addAccount(account: Account): void {
    const accounts = this.getAccounts()
    accounts.push(account)
    this.setAccounts(accounts)
  }

  public removeAccount(accountId: string): void {
    const accounts = this.getAccounts()
    this.setAccounts(accounts.filter((a) => a.id !== accountId))
  }

  public updateAccount(accountId: string, updates: Partial<Account>): void {
    const accounts = this.getAccounts()
    const index = accounts.findIndex((a) => a.id === accountId)
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updates }
      this.setAccounts(accounts)
    }
  }

  public getFavoriteGames(): string[] {
    return this.data.favoriteGames || []
  }

  public addFavoriteGame(placeId: string): void {
    const favorites = this.data.favoriteGames || []
    if (!favorites.includes(placeId)) {
      this.data.favoriteGames = [...favorites, placeId]
      this.save()
    }
  }

  public removeFavoriteGame(placeId: string): void {
    const favorites = this.data.favoriteGames || []
    this.data.favoriteGames = favorites.filter((id) => id !== placeId)
    this.save()
  }

  public getFavoriteItems(): { id: number; name: string; type: string }[] {
    return this.data.favoriteItems || []
  }

  public addFavoriteItem(item: { id: number; name: string; type: string }): void {
    const favorites = this.data.favoriteItems || []
    if (!favorites.some((i) => i.id === item.id)) {
      this.data.favoriteItems = [...favorites, item]
      this.save()
    }
  }

  public removeFavoriteItem(itemId: number): void {
    const favorites = this.data.favoriteItems || []
    this.data.favoriteItems = favorites.filter((i) => i.id !== itemId)
    this.save()
  }

  public getSettings() {
    const sidebarTabOrder = sanitizeSidebarOrder(this.data.settings?.sidebarTabOrder)
    const sidebarHiddenTabs = sanitizeSidebarHidden(this.data.settings?.sidebarHiddenTabs)
    const storedAccent = this.data.settings?.accentColor
    const legacyAccent = storedAccent ? storedAccent.trim().toLowerCase() : ''
    const LEGACY_DEFAULT_ACCENT_COLORS = ['#1e66f5', '#3b82f6', '#2563eb']

    const accentColor =
      legacyAccent && legacyAccent !== '#ffffff'
        ? LEGACY_DEFAULT_ACCENT_COLORS.includes(legacyAccent)
          ? DEFAULT_ACCENT_COLOR
          : storedAccent!
        : DEFAULT_ACCENT_COLOR


    if (legacyAccent && LEGACY_DEFAULT_ACCENT_COLORS.includes(legacyAccent)) {
      if (!this.data.settings) this.data.settings = {}
      if (this.data.settings.accentColor !== DEFAULT_ACCENT_COLOR) {
        this.data.settings.accentColor = DEFAULT_ACCENT_COLOR
        this.save()
      }
    }

    return {
      primaryAccountId: this.data.settings?.primaryAccountId ?? null,
      allowMultipleInstances: this.data.settings?.allowMultipleInstances ?? false,
      defaultInstallationPath: this.data.settings?.defaultInstallationPath ?? null,
      accentColor,
      useDynamicAccentColor: this.data.settings?.useDynamicAccentColor ?? false,
      theme: (this.data.settings?.theme as ThemePreference | undefined) ?? 'system',
      tint: (this.data.settings?.tint as TintPreference | undefined) ?? 'neutral',
      showSidebarProfileCard: this.data.settings?.showSidebarProfileCard ?? true,
      privacyMode: this.data.settings?.privacyMode ?? false,
      sidebarTabOrder,
      sidebarHiddenTabs,
      pinCode: this.data.settings?.pinCodeHash ? 'SET' : null
    }
  }




  public getPinHash(): string | null {
    return this.data.settings?.pinCodeHash ?? null
  }




  public setPin(
    pin: string | null,
    currentPin?: string
  ): {
    success: boolean
    error?: string
    locked?: boolean
    lockoutSeconds?: number
    remainingAttempts?: number
  } {
    const existingHash = this.getPinHash()
    const accounts = this.decryptedAccounts || []

    if (existingHash) {
      if (!currentPin) {
        return { success: false, error: 'Current PIN required to change or remove PIN' }
      }

      const verifyResult = pinService.verifyCurrentPinForChange(currentPin, existingHash)
      if (!verifyResult.success) {
        if (verifyResult.updatedEncryptedData) {
          if (!this.data.settings) {
            this.data.settings = {}
          }
          this.data.settings.pinCodeHash = verifyResult.updatedEncryptedData
          this.save()
        }
        return {
          success: false,
          error: verifyResult.locked ? 'Too many failed attempts' : 'Incorrect current PIN',
          locked: verifyResult.locked,
          lockoutSeconds: verifyResult.lockoutSeconds,
          remainingAttempts: verifyResult.remainingAttempts
        }
      }
    }

    if (pin === null) {
      if (this.data.settings) {
        this.data.settings.pinCodeHash = null
      }
      pinService.resetAttempts()
      pinService.markVerified()
      this.currentVerifiedPin = null
      this.decryptedAccounts = null
      this.save()
      return { success: true }
    }

    const hash = pinService.createPinHash(pin)

    if (!hash) {
      console.error('Secure storage unavailable. PIN will not be stored unencrypted.')
      return { success: false, error: 'Secure storage unavailable' }
    }

    if (!this.data.settings) {
      this.data.settings = {}
    }

    this.data.settings.pinCodeHash = hash


    pinService.verifyPin(pin, hash)
    this.currentVerifiedPin = pin


    if (accounts.length > 0) {
      const encrypted = this.encryptAccountsWithPin(accounts, pin)
      if (encrypted) {
        this.data.encryptedAccounts = encrypted
      }
    }

    this.save()
    return { success: true }
  }




  public verifyPin(pin: string): {
    success: boolean
    locked: boolean
    remainingAttempts: number
    lockoutSeconds?: number
  } {
    const hash = this.getPinHash()

    if (!hash) {
      return { success: false, locked: false, remainingAttempts: 5 }
    }

    const result = pinService.verifyPin(pin, hash)

    if (result.updatedEncryptedData) {
      if (!this.data.settings) {
        this.data.settings = {}
      }
      this.data.settings.pinCodeHash = result.updatedEncryptedData
      this.save()
    }


    if (result.success) {
      this.currentVerifiedPin = pin
      this.decryptedAccounts = null
    }

    return {
      success: result.success,
      locked: result.locked,
      remainingAttempts: result.remainingAttempts,
      lockoutSeconds: result.lockoutSeconds
    }
  }




  public isPinCurrentlyVerified(): boolean {
    return pinService.isPinCurrentlyVerified()
  }




  public getPinLockoutStatus(): {
    locked: boolean
    lockoutSeconds?: number
    remainingAttempts: number
  } {
    const hash = this.getPinHash()
    return pinService.getLockoutStatus(hash || undefined)
  }

  public setSettings(settings: {
    primaryAccountId?: string | null
    allowMultipleInstances?: boolean
    defaultInstallationPath?: string | null
    accentColor?: string
    useDynamicAccentColor?: boolean
    theme?: ThemePreference
    tint?: TintPreference
    showSidebarProfileCard?: boolean
    privacyMode?: boolean
    sidebarTabOrder?: TabId[]
    sidebarHiddenTabs?: TabId[]
    pinCode?: string | null
  }): void {
    const nextSettings = { ...this.getSettings() }

    if ('primaryAccountId' in settings) {
      nextSettings.primaryAccountId = settings.primaryAccountId ?? null
    }

    if (process.platform === 'win32') {
      if ('allowMultipleInstances' in settings) {
        nextSettings.allowMultipleInstances = !!settings.allowMultipleInstances
      }
    } else {
      nextSettings.allowMultipleInstances = false
    }

    if ('defaultInstallationPath' in settings) {
      nextSettings.defaultInstallationPath = settings.defaultInstallationPath ?? null
    }

    if ('accentColor' in settings && typeof settings.accentColor === 'string') {
      nextSettings.accentColor = settings.accentColor
    }

    if ('useDynamicAccentColor' in settings) {
      nextSettings.useDynamicAccentColor = !!settings.useDynamicAccentColor
    }

    if ('theme' in settings && typeof settings.theme === 'string') {
      nextSettings.theme = settings.theme as ThemePreference
    }

    if ('tint' in settings && typeof settings.tint === 'string') {
      nextSettings.tint = settings.tint as TintPreference
    }

    if ('showSidebarProfileCard' in settings) {
      nextSettings.showSidebarProfileCard = !!settings.showSidebarProfileCard
    }

    if ('privacyMode' in settings) {
      nextSettings.privacyMode = !!settings.privacyMode
    }

    if ('sidebarTabOrder' in settings) {
      nextSettings.sidebarTabOrder = sanitizeSidebarOrder(
        Array.isArray(settings.sidebarTabOrder)
          ? (settings.sidebarTabOrder as TabId[])
          : nextSettings.sidebarTabOrder
      )
    }

    if ('sidebarHiddenTabs' in settings) {
      nextSettings.sidebarHiddenTabs = sanitizeSidebarHidden(
        Array.isArray(settings.sidebarHiddenTabs)
          ? (settings.sidebarHiddenTabs as TabId[])
          : nextSettings.sidebarHiddenTabs
      )
    }

    if ('pinCode' in settings) {
      this.setPin(settings.pinCode ?? null)
    }

    nextSettings.sidebarTabOrder = sanitizeSidebarOrder(nextSettings.sidebarTabOrder)
    nextSettings.sidebarHiddenTabs = sanitizeSidebarHidden(nextSettings.sidebarHiddenTabs)

    const { pinCode, ...settingsWithoutPin } = nextSettings
    void pinCode
    this.data.settings = {
      ...(this.data.settings ?? {}),
      ...(settingsWithoutPin as any)
    }
    this.save()

    if (nextSettings.allowMultipleInstances) {
      MultiInstance.Enable()
    } else {
      MultiInstance.Disable()
    }
  }

  public getExcludeFullGames(): boolean {
    return this.data.excludeFullGames ?? false
  }

  public setExcludeFullGames(excludeFullGames: boolean): void {
    this.data.excludeFullGames = excludeFullGames
    this.save()
  }

  public getAvatarRenderWidth(): number | undefined {
    return this.data.avatarRenderWidth
  }

  public setAvatarRenderWidth(width: number): void {
    this.data.avatarRenderWidth = width
    this.save()
  }

  public getWindowWidth(): number | undefined {
    return this.data.windowWidth
  }

  public setWindowWidth(width: number): void {
    this.data.windowWidth = width
    this.save()
  }

  public getWindowHeight(): number | undefined {
    return this.data.windowHeight
  }

  public setWindowHeight(height: number): void {
    this.data.windowHeight = height
    this.save()
  }

  public getCustomFonts(): { family: string; url: string }[] {
    return this.data.customFonts || []
  }

  public addCustomFont(font: { family: string; url: string }): void {
    const fonts = this.data.customFonts || []
    if (!fonts.some((f) => f.family === font.family)) {
      this.data.customFonts = [...fonts, font]
      this.save()
    }
  }

  public removeCustomFont(family: string): void {
    const fonts = this.data.customFonts || []
    this.data.customFonts = fonts.filter((f) => f.family !== family)
    if (this.data.activeFont === family) {
      this.data.activeFont = null
    }
    this.save()
  }

  public getActiveFont(): string | null {
    return this.data.activeFont ?? null
  }

  public setActiveFont(family: string | null): void {
    this.data.activeFont = family
    this.save()
  }
}

export const storageService = new StorageService()