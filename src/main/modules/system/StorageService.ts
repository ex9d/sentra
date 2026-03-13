import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { app } from 'electron'
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
import { getDataFile } from '../../utils/paths'

const customFontSchema = z.object({
  family: z.string(),
  url: z.string()
})

const sidebarTabIdEnum = z.enum(SIDEBAR_TAB_IDS)
const themePreferenceEnum = z.enum(['system', 'dark', 'light'])
const tintPreferenceEnum = z.enum(['neutral', 'cool', 'warm', 'forest', 'twilight'])

const storeDataSchema = z.object({
  sidebarWidth: z.number().optional(),
  sidebarCollapsed: z.boolean().optional(),
  accountsViewMode: z.enum(['list', 'grid']).optional(),
  avatarRenderWidth: z.number().optional(),
  windowWidth: z.number().optional(),
  windowHeight: z.number().optional(),
  // Encrypted accounts stored as base64 string
  encryptedAccounts: z.string().optional(),
  // Encrypted license key (AES + user PIN)
  encryptedLicense: z.string().optional(),
  favoriteGames: z.array(z.string()).optional(),
  favoriteItems: z.array(favoriteItemSchema).optional(),
  excludeFullGames: z.boolean().optional(),
  customFonts: z.array(customFontSchema).optional(),
  activeFont: z.string().nullable().optional(),
  // Watcher/Multi-Account settings
  watcherConfig: z.object({
    autoRestart: z.boolean().optional(),
    enableRAMLimiter: z.boolean().optional(),
    ramLimitMB: z.number().optional()
  }).optional(),
  // Roblox-specific advanced settings
  robloxSettings: z.object({
    allowMultipleLaunches: z.boolean().optional(),
    defaultPhysicsEngine: z.enum(['Terrain', 'Legacy']).optional(),
    enableOptimizations: z.boolean().optional(),
    memoryLimit: z.number().optional(),
    useDirectX12: z.boolean().optional(),
    lowEndGraphics: z.boolean().optional(),
    disableDualChannelAudio: z.boolean().optional()
  }).optional(),
  settings: z
    .object({
      primaryAccountId: z.string().nullable().optional(),
      allowMultipleInstances: z.boolean().optional(),
      defaultInstallationPath: z.string().nullable().optional(),
      accentColor: z.string().optional(),
      useDynamicAccentColor: z.boolean().optional(),
      theme: themePreferenceEnum.optional(),
      tint: tintPreferenceEnum.optional(),
      customTheme: z.string().optional(),
      privacyMode: z.boolean().optional(),
      showSidebarProfileCard: z.boolean().optional(),
      sidebarTabOrder: z.array(sidebarTabIdEnum).optional(),
      sidebarHiddenTabs: z.array(sidebarTabIdEnum).optional(),
      // pinCodeHash stores the encrypted, hashed PIN (not plain text)
      pinCodeHash: z.string().nullable().optional(),
      pinLockout: z.object({
        count: z.number(),
        lastAttempt: z.number(),
        lockedUntil: z.number().nullable()
      }).optional(),
      browserWindowWidth: z.number().nullable().optional(),
      browserWindowHeight: z.number().nullable().optional(),
      showReturnPageButton: z.boolean().optional()
    })
    .optional()
})

type StoreData = z.infer<typeof storeDataSchema>

class StorageService {
  private path: string
  private data: StoreData = {}
  private decryptedAccounts: Account[] | null = null
  private currentVerifiedPin: string | null = null
  // holds the raw encrypted payload when config.json is encrypted
  private encryptedBlob: string | null = null
  // PIN lockout state for persistence
  private pinLockoutState = { count: 0, lastAttempt: 0, lockedUntil: null as number | null }

  constructor() {
    // determine current path and try migrating any prior config
    this.path = getDataFile('config.json')
    console.log('[StorageService] initializing with path', this.path)
    this.init()
  }

  private init(): void {
    try {
      if (!existsSync(this.path)) {
        // attempt migration from old userData location if available
        const altDir = join(app.getPath('userData'), 'Sentra')
        const altPath = join(altDir, 'config.json')
        if (existsSync(altPath)) {
          try {
            const altContent = readFileSync(altPath, 'utf-8')
            // copy file to new location
            const dir = getDataFile()
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
            writeFileSync(this.path, altContent)
            console.log('[StorageService] migrated config from userData to Documents')
          } catch (e) {
            console.error('[StorageService] failed to migrate config file:', e)
          }
        }
      }

      if (!existsSync(this.path)) {
        const dir = getDataFile()
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

  /**
   * Decrypts the full configuration blob if it was previously stored encrypted
   * and we currently have a valid encryption key (i.e. PIN has been verified).
   * This merges the decrypted data back into `this.data` and clears
   * `this.encryptedBlob` so future operations operate on real state.
   */
  #decryptConfigBlobIfNeeded(): void {
    if (!this.encryptedBlob) return
    if (!pinService.hasEncryptionKey()) return

    try {
      console.log('[StorageService] attempting to decrypt full config blob')
      const decrypted = pinService.decryptWithVerifiedKey(this.encryptedBlob)
      if (decrypted) {
        console.log('[StorageService] full config blob decrypted successfully')
        const raw = JSON.parse(decrypted)
        const result = storeDataSchema.safeParse(raw)
        if (result.success) {
          this.data = result.data
          this.migratePin()
        } else {
          console.error('[StorageService] decrypted config validation failed', result.error)
          // Reset to empty to allow new saves
          this.data = {}
        }
      } else {
        console.error('[StorageService] failed to decrypt config blob with verified key')
        // Reset to empty to allow new saves
        this.data = {}
      }
    } catch (e) {
      console.error('[StorageService] error decrypting config blob', e)
      // Reset to empty to allow new saves
      this.data = {}
    }

    this.encryptedBlob = null
  }

  private load(): void {
    try {
      const fileContent = readFileSync(this.path, 'utf-8').replace(/^\uFEFF/, '')
      const trimmed = fileContent.trim()

      // attempt to parse as JSON; if it fails we treat the whole file as encrypted
      let rawData: unknown
      try {
        rawData = JSON.parse(trimmed)
      } catch (e) {
        console.log('[StorageService] config.json parse failed, assuming encrypted payload')
        this.encryptedBlob = trimmed
        this.data = {}
        return
      }

      // check for wrapped encrypted format
      if (
        rawData &&
        typeof rawData === 'object' &&
        'encrypted' in (rawData as any) &&
        typeof (rawData as any).encrypted === 'string'
      ) {
        this.encryptedBlob = (rawData as any).encrypted.replace(/^\uFEFF/, '')
        this.data = {}
        return
      }

      const result = storeDataSchema.safeParse(rawData)
      if (result.success) {
        this.data = result.data
        this.encryptedBlob = null // Clear any previous encrypted blob state
        this.migratePin()
        // Load PIN lockout state (with sanitization)
        const loadedLockout = this.data.settings?.pinLockout
        if (loadedLockout) {
          // coerce numbers in case something was corrupted
          const count = Number(loadedLockout.count) || 0
          const lastAttempt = Number(loadedLockout.lastAttempt) || 0
          const lockedUntil =
            loadedLockout.lockedUntil === null ? null : Number(loadedLockout.lockedUntil) || null
          this.pinLockoutState = { count, lastAttempt, lockedUntil }
        } else {
          this.pinLockoutState = { count: 0, lastAttempt: 0, lockedUntil: null }
        }
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
    // Remove any legacy unencrypted PIN data for security
    if (this.data.settings && 'pinCode' in this.data.settings) {
      delete (this.data.settings as any).pinCode
      this.save()
    }
  }

  private save(): void {
    // if the config is still stored as an encrypted blob we shouldn't overwrite
    if (this.encryptedBlob) {
      console.warn('[StorageService] save called while config is still encrypted; skipping write')
      return
    }

    try {
      console.log('[StorageService] save: writing to', this.path)
      console.log('[StorageService] save: data keys:', Object.keys(this.data))
      console.log('[StorageService] save: encryptedAccounts length:', this.data.encryptedAccounts?.length || 0)
      
      // make sure the directory is still there (macOS cleaners may remove it)
      const dir = dirname(this.path)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      let output: string

      // Update PIN lockout state in data before saving
      if (!this.data.settings) {
        this.data.settings = {}
      }
      this.data.settings.pinLockout = this.pinLockoutState

      if (pinService.hasEncryptionKey()) {
        const plain = JSON.stringify(this.data, null, 2)
        const enc = pinService.encryptWithVerifiedKey(plain)
        if (enc) {
          output = JSON.stringify({ encrypted: enc }, null, 2)
        } else {
          console.error('[StorageService] failed to encrypt full config with PIN')
          output = JSON.stringify(this.data, null, 2)
        }
      } else {
        output = JSON.stringify(this.data, null, 2)
      }

      console.log('[StorageService] save: output length:', output.length)
      writeFileSync(this.path, output)
      console.log('[StorageService] save: successfully wrote to disk')
    } catch (error) {
      console.error('Failed to save storage:', error)
    }
  }

  /**
   * Encrypt accounts with PIN using AES-256-GCM
   */
  private encryptAccountsWithPin(accounts: Account[], pin: string): string | null {
    try {
      // Derive key from PIN using PBKDF2 (256-bit key)
      const salt = crypto.randomBytes(16)
      const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256')

      // Generate IV and encryption cipher
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

      // Encrypt the accounts JSON
      const plaintext = JSON.stringify(accounts)
      let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
      encrypted += cipher.final('hex')

      // Get authentication tag
      const authTag = cipher.getAuthTag()

      // Combine: salt + iv + authTag + encrypted data (all hex encoded)
      const combined = salt.toString('hex') + iv.toString('hex') + authTag.toString('hex') + encrypted

      return combined
    } catch (error) {
      console.error('Failed to encrypt accounts:', error)
      return null
    }
  }

  /**
   * Decrypt accounts with PIN using AES-256-GCM
   */
  private decryptAccountsWithPin(encryptedData: string, pin: string): Account[] | null {
    try {
      // First, try to parse as plain JSON (in case it was stored without encryption)
      try {
        const parsed = JSON.parse(encryptedData)
        if (Array.isArray(parsed)) {
          console.log('[StorageService] Loaded accounts as plain JSON (no encryption)')
          return parsed
        }
      } catch (e) {
        // Not plain JSON, continue to decrypt
      }

      // If not plain JSON, try to decrypt
      // Parse: salt (32 hex chars) + iv (24 hex chars) + authTag (32 hex chars) + encrypted data (rest)
      if (encryptedData.length < 88) {
        // Too short to be encrypted data
        return null
      }

      const salt = Buffer.from(encryptedData.substring(0, 32), 'hex')
      const iv = Buffer.from(encryptedData.substring(32, 56), 'hex')
      const authTag = Buffer.from(encryptedData.substring(56, 88), 'hex')
      const encrypted = encryptedData.substring(88)

      // Derive key from PIN
      const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256')

      // Decrypt
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)

      let plaintext = decipher.update(encrypted, 'hex', 'utf-8')
      plaintext += decipher.final('utf-8')

      const accounts = JSON.parse(plaintext)
      return Array.isArray(accounts) ? accounts : null
    } catch (error) {
      console.error('[StorageService] Failed to decrypt accounts:', error)
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

  /**
   * Get accounts - returns empty array if PIN not verified
   */
  public getAccounts(): Account[] {
    // if the entire config is still encrypted we have no data yet
    if (this.encryptedBlob) {
      // attempt decryption if we have the key available (PIN verified)
      this.#decryptConfigBlobIfNeeded()
      if (this.encryptedBlob) {
        return []
      }
    }

    const pinHash = this.getPinHash()

    // If we haven't decrypted yet, try to decrypt
    if (this.decryptedAccounts === null && this.data.encryptedAccounts) {
      if (pinHash) {
        // PIN is set - need verified PIN to decrypt
        if (this.currentVerifiedPin) {
          console.log('[StorageService] decrypting accounts with verified PIN')
          this.decryptedAccounts = this.decryptAccountsWithPin(
            this.data.encryptedAccounts,
            this.currentVerifiedPin
          )
          if (!this.decryptedAccounts) {
            console.error('[StorageService] Failed to decrypt accounts with verified PIN, returning empty')
            this.decryptedAccounts = []
          }
        } else {
          console.log('[StorageService] PIN is set but not verified, cannot decrypt accounts')
          this.decryptedAccounts = []
        }
      } else {
        // No PIN set - try to load as plaintext
        try {
          const parsed = JSON.parse(this.data.encryptedAccounts)
          if (Array.isArray(parsed)) {
            console.log('[StorageService] loaded plaintext accounts (no PIN set)')
            this.decryptedAccounts = parsed
          } else {
            console.warn('Stored accounts data is not a valid array, resetting to empty')
            this.decryptedAccounts = []
          }
        } catch (error) {
          console.error('Failed to parse stored accounts as JSON:', error)
          this.decryptedAccounts = []
        }
      }
    }

    // If PIN is set but not verified and we still don't have decrypted accounts, return empty
    if (pinHash && !this.currentVerifiedPin && this.decryptedAccounts?.length === 0) {
      return []
    }

    return this.decryptedAccounts || []
  }

  /**
   * Set accounts - encrypts and saves
   */
  public setAccounts(accounts: Account[]): boolean {
    const pinHash = this.getPinHash()

    // If PIN is set (during onboarding or later), encrypt with current verified PIN
    if (pinHash) {
      if (!this.currentVerifiedPin) {
        throw new Error('PIN must be verified before saving accounts')
      }

      const pinToUse = this.currentVerifiedPin
      console.log('[StorageService] setAccounts: encrypting', accounts.length, 'accounts with PIN')

      let encrypted: string | null = null
      try {
        encrypted = this.encryptAccountsWithPin(accounts, pinToUse)
      } catch (e) {
        console.error('[StorageService] setAccounts: encryption error:', e)
        throw new Error('Failed to encrypt accounts: ' + String(e))
      }

      if (!encrypted) {
        throw new Error('Failed to encrypt accounts: result was null')
      }

      console.log('[StorageService] setAccounts: encrypted successfully, encrypted length:', encrypted.length)
      this.data.encryptedAccounts = encrypted
      this.decryptedAccounts = accounts
      this.save()
      console.log('[StorageService] setAccounts: saved to disk')
      return true
    } else {
      // No PIN yet - store plaintext for now
      this.data.encryptedAccounts = JSON.stringify(accounts)
      this.decryptedAccounts = accounts
      this.save()
      console.log('[StorageService] setAccounts: saved plaintext (no PIN set yet)')
      return true
    }
  }

  public removeAccount(accountId: string): boolean {
    const accounts = this.getAccounts()
    return this.setAccounts(accounts.filter((a) => a.id !== accountId))
  }

  public updateAccount(accountId: string, updates: Partial<Account>): boolean {
    const accounts = this.getAccounts()
    const index = accounts.findIndex((a) => a.id === accountId)
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updates }
      return this.setAccounts(accounts)
    }
    return false
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

    // Persist the migration so future sessions match.
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
      pinCode: this.data.settings?.pinCodeHash ? 'SET' : null,
      browserWindowWidth: this.data.settings?.browserWindowWidth ?? null,
      browserWindowHeight: this.data.settings?.browserWindowHeight ?? null,
      showReturnPageButton: this.data.settings?.showReturnPageButton ?? false
    }
  }

  /**
   * Get the raw encrypted PIN hash for verification
   */
  public getPinHash(): string | null {
    const hash = this.data.settings?.pinCodeHash ?? null
    if (hash && typeof hash === 'string') {
      // Validate format: should be hex:hex
      const parts = hash.split(':')
      if (parts.length === 2 && /^[0-9a-f]+$/i.test(parts[0]) && /^[0-9a-f]+$/i.test(parts[1])) {
        return hash
      }
      console.warn('[StorageService] Invalid PIN hash format detected, removing corrupted PIN data')
      // Remove corrupted PIN data
      if (this.data.settings) {
        delete this.data.settings.pinCodeHash
        delete this.data.settings.pinLockout
      }
      this.pinLockoutState = { count: 0, lastAttempt: 0, lockedUntil: null }
      this.save()
    }
    return null
  }  /**
   * Get encrypted license (if any)
   */
  public getEncryptedLicense(): string | null {
    return this.data.encryptedLicense ?? null
  }

  /**
   * Store an encrypted license string (or null to clear)
   */
  public setEncryptedLicense(encrypted: string | null): void {
    if (encrypted === null) {
      if (this.data.encryptedLicense) delete this.data.encryptedLicense
    } else {
      this.data.encryptedLicense = encrypted
    }
    this.save()
  }

  /**
   * Delete encrypted license
   */
  public deleteEncryptedLicense(): void {
    if (this.data.encryptedLicense) {
      delete this.data.encryptedLicense
      this.save()
    }
  }

  /**
   * Clear all stored data and persist an empty config.json
   */
  public clearAll(): void {
    this.data = {}
    try {
      MultiInstance.Disable()
    } catch (e) {
      // ignore
    }
    this.save()
  }

  /**
   * Set a new PIN (will be hashed and encrypted)
   */
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
    const now = Date.now()

    // Ensure we can access accounts before changing PIN
    // If accounts haven't been decrypted yet, decrypt them with current PIN
    let accounts = this.decryptedAccounts
    if (!accounts && this.data.encryptedAccounts && existingHash && currentPin?.trim()) {
      // Decrypt existing accounts with current PIN so we can re-encrypt with new PIN
      accounts = this.decryptAccountsWithPin(this.data.encryptedAccounts, currentPin.trim())
      if (!accounts) {
        // If decryption fails, return error
        return { success: false, error: 'Failed to prepare accounts for re-encryption' }
      }
    } else {
      accounts = accounts || []
    }

    if (existingHash && accounts.length > 0) {
      if (!currentPin) {
        return { success: false, error: 'Current PIN required to change or remove PIN' }
      }

      // Check if currently locked from previous failed attempts
      if (this.pinLockoutState.lockedUntil && now < this.pinLockoutState.lockedUntil) {
        const lockoutSeconds = Math.ceil((this.pinLockoutState.lockedUntil - now) / 1000)
        return {
          success: false,
          error: 'Too many failed attempts',
          locked: true,
          lockoutSeconds,
          remainingAttempts: 0
        }
      }

      const verifyResult = pinService.verifyPin(currentPin?.trim() || '', existingHash)
      if (!verifyResult.success) {
        // Track failed PIN verification attempt
        this.pinLockoutState.count++
        this.pinLockoutState.lastAttempt = now
        const remainingAttempts = Math.max(0, 5 - this.pinLockoutState.count)

        if (this.pinLockoutState.count >= 5) {
          // Apply lockout after 5 failed attempts
          const lockoutMultiplier = Math.min(this.pinLockoutState.count - 4, 12)
          const lockoutDuration = 5 * 60 * 1000 * lockoutMultiplier
          this.pinLockoutState.lockedUntil = now + lockoutDuration
          this.save()
          return {
            success: false,
            error: 'Too many failed attempts',
            locked: true,
            lockoutSeconds: Math.ceil(lockoutDuration / 1000),
            remainingAttempts: 0
          }
        }

        this.save()
        return {
          success: false,
          error: 'Incorrect current PIN',
          locked: false,
          remainingAttempts
        }
      }

      // Reset lockout state on successful verification
      this.pinLockoutState = { count: 0, lastAttempt: 0, lockedUntil: null }
    }

    if (pin === null) {
      if (this.data.settings) {
        this.data.settings.pinCodeHash = null
      }
      pinService.resetAttempts()
      pinService.markVerified()
      this.currentVerifiedPin = null
      this.decryptedAccounts = null
      // Reset lockout state when removing PIN
      this.pinLockoutState = { count: 0, lastAttempt: 0, lockedUntil: null }
      this.save()
      return { success: true }
    }

    const hash = pinService.createPinHash(pin.trim())

    if (!hash) {
      console.error('Secure storage unavailable. PIN will not be stored unencrypted.')
      return { success: false, error: 'Secure storage unavailable' }
    }

    if (!this.data.settings) {
      this.data.settings = {}
    }

    this.data.settings.pinCodeHash = hash

    // Reset PIN lockout state for new PIN
    this.pinLockoutState = { count: 0, lastAttempt: 0, lockedUntil: null }

    // Verify the new PIN to set the internal encryption key state
    pinService.verifyPin(pin.trim(), hash)
    pinService.resetAttempts()
    pinService.markVerified()
    this.currentVerifiedPin = pin.trim()

    // Re-encrypt accounts with new PIN
    if (accounts.length > 0) {
      const encrypted = this.encryptAccountsWithPin(accounts, pin)
      if (encrypted) {
        this.data.encryptedAccounts = encrypted
      }
    }

    this.save()
    return { success: true }
  }

  /**
   * Verify a PIN attempt for app unlock
   */
  public verifyPin(pin: string): {
    success: boolean
    locked: boolean
    remainingAttempts: number
    lockoutSeconds?: number
  } {
    const trimmedPin = pin.trim()
    const hash = this.getPinHash()

    if (!hash) {
      return { success: false, locked: false, remainingAttempts: 5 }
    }

    const now = Date.now()

    // Check if currently locked
    if (this.pinLockoutState.lockedUntil && now < this.pinLockoutState.lockedUntil) {
      const seconds = Math.ceil((this.pinLockoutState.lockedUntil - now) / 1000)
      return { success: false, locked: true, remainingAttempts: 0, lockoutSeconds: seconds }
    }

    // Check if attempts should reset (15 minutes since last attempt)
    if (this.pinLockoutState.lastAttempt && now - this.pinLockoutState.lastAttempt > 15 * 60 * 1000) {
      this.pinLockoutState.count = 0
      this.pinLockoutState.lastAttempt = 0
      this.pinLockoutState.lockedUntil = null
    }

    const result = pinService.verifyPin(trimmedPin, hash)

    if (result.success) {
      console.log('[StorageService] PIN verification successful')
      this.currentVerifiedPin = trimmedPin
      pinService.resetAttempts()
      pinService.markVerified()

      // Reset lockout state on successful verification
      this.pinLockoutState.count = 0
      this.pinLockoutState.lastAttempt = 0
      this.pinLockoutState.lockedUntil = null
      this.save()

      this.#decryptConfigBlobIfNeeded()
      this.decryptedAccounts = null

      return { success: true, locked: false, remainingAttempts: 5 }
    } else {
      console.log('[StorageService] PIN verification failed, updating lockout state')
    }

    // Failed attempt - update lockout state
    this.pinLockoutState.count++
    this.pinLockoutState.lastAttempt = now

    const remainingAttempts = Math.max(0, 5 - this.pinLockoutState.count)

    if (this.pinLockoutState.count >= 5) {
      // Calculate lockout duration with progressive penalty
      const lockoutMultiplier = Math.min(this.pinLockoutState.count - 4, 12) // Start at 1, max 12
      const lockoutDuration = 5 * 60 * 1000 * lockoutMultiplier // 5 min * multiplier
      this.pinLockoutState.lockedUntil = now + lockoutDuration
      this.save()
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(lockoutDuration / 1000)
      }
    }

    this.save()
    return { success: false, locked: false, remainingAttempts }
  }

  /**
   * Check if PIN is currently verified (delegates to PinService)
   */
  public isPinCurrentlyVerified(): boolean {
    return pinService.isPinCurrentlyVerified()
  }

  /**
   * Get PIN lockout status
   */
  public getPinLockoutStatus(): {
    locked: boolean
    lockoutSeconds?: number
    remainingAttempts: number
  } {
    const now = Date.now()

    // Check if currently locked
    if (this.pinLockoutState.lockedUntil && now < this.pinLockoutState.lockedUntil) {
      const seconds = Math.ceil((this.pinLockoutState.lockedUntil - now) / 1000)
      return { locked: true, lockoutSeconds: seconds, remainingAttempts: 0 }
    }

    // Check if attempts should reset
    if (this.pinLockoutState.lastAttempt && now - this.pinLockoutState.lastAttempt > 15 * 60 * 1000) {
      this.pinLockoutState.count = 0
      this.pinLockoutState.lastAttempt = 0
      this.pinLockoutState.lockedUntil = null
    }

    const remainingAttempts = Math.max(0, 5 - this.pinLockoutState.count)
    return { locked: false, remainingAttempts }
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
    browserWindowWidth?: number | null
    browserWindowHeight?: number | null
    showReturnPageButton?: boolean
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

    if ('browserWindowWidth' in settings) {
      nextSettings.browserWindowWidth = settings.browserWindowWidth ?? null
    }

    if ('browserWindowHeight' in settings) {
      nextSettings.browserWindowHeight = settings.browserWindowHeight ?? null
    }

    if ('showReturnPageButton' in settings) {
      nextSettings.showReturnPageButton = !!settings.showReturnPageButton
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

  /**
   * Get watcher configuration
   */
  public getWatcherConfig(): { autoRestart: boolean; enableRAMLimiter: boolean; ramLimitMB: number } {
    return {
      autoRestart: this.data.watcherConfig?.autoRestart ?? true,
      enableRAMLimiter: this.data.watcherConfig?.enableRAMLimiter ?? false,
      ramLimitMB: this.data.watcherConfig?.ramLimitMB ?? 800
    }
  }

  /**
   * Set watcher configuration
   */
  public setWatcherConfig(config: { autoRestart?: boolean; enableRAMLimiter?: boolean; ramLimitMB?: number }): void {
    if (!this.data.watcherConfig) {
      this.data.watcherConfig = {}
    }
    if (config.autoRestart !== undefined) {
      this.data.watcherConfig.autoRestart = config.autoRestart
    }
    if (config.enableRAMLimiter !== undefined) {
      this.data.watcherConfig.enableRAMLimiter = config.enableRAMLimiter
    }
    if (config.ramLimitMB !== undefined) {
      this.data.watcherConfig.ramLimitMB = config.ramLimitMB
    }
    this.save()
  }

  /**
   * Get allow multiple instances setting
   */
  public getAllowMultipleInstances(): boolean {
    return this.data.settings?.allowMultipleInstances ?? false
  }

  /**
   * Set allow multiple instances setting
   */
  public setAllowMultipleInstances(allow: boolean): void {
    if (!this.data.settings) {
      this.data.settings = {}
    }
    // Windows only
    if (process.platform === 'win32') {
      this.data.settings.allowMultipleInstances = allow
    } else {
      this.data.settings.allowMultipleInstances = false
    }
    this.save()
    // Update MultiInstance state
    if (this.data.settings.allowMultipleInstances) {
      MultiInstance.Enable()
    } else {
      MultiInstance.Disable()
    }
  }

  /**
   * Get Roblox settings
   */
  public getRobloxSettings() {
    return {
      allowMultipleLaunches: this.data.robloxSettings?.allowMultipleLaunches ?? true,
      defaultPhysicsEngine: (this.data.robloxSettings?.defaultPhysicsEngine as 'Terrain' | 'Legacy' | undefined) ?? 'Terrain',
      enableOptimizations: this.data.robloxSettings?.enableOptimizations ?? true,
      memoryLimit: this.data.robloxSettings?.memoryLimit ?? 0,
      useDirectX12: this.data.robloxSettings?.useDirectX12 ?? true,
      lowEndGraphics: this.data.robloxSettings?.lowEndGraphics ?? false,
      disableDualChannelAudio: this.data.robloxSettings?.disableDualChannelAudio ?? false
    }
  }

  /**
   * Set Roblox settings
   */
  public setRobloxSettings(settings: {
    allowMultipleLaunches?: boolean
    defaultPhysicsEngine?: 'Terrain' | 'Legacy'
    enableOptimizations?: boolean
    memoryLimit?: number
    useDirectX12?: boolean
    lowEndGraphics?: boolean
    disableDualChannelAudio?: boolean
  }): void {
    if (!this.data.robloxSettings) {
      this.data.robloxSettings = {}
    }
    if (settings.allowMultipleLaunches !== undefined) {
      this.data.robloxSettings.allowMultipleLaunches = settings.allowMultipleLaunches
    }
    if (settings.defaultPhysicsEngine !== undefined) {
      this.data.robloxSettings.defaultPhysicsEngine = settings.defaultPhysicsEngine
    }
    if (settings.enableOptimizations !== undefined) {
      this.data.robloxSettings.enableOptimizations = settings.enableOptimizations
    }
    if (settings.memoryLimit !== undefined) {
      this.data.robloxSettings.memoryLimit = settings.memoryLimit
    }
    if (settings.useDirectX12 !== undefined) {
      this.data.robloxSettings.useDirectX12 = settings.useDirectX12
    }
    if (settings.lowEndGraphics !== undefined) {
      this.data.robloxSettings.lowEndGraphics = settings.lowEndGraphics
    }
    if (settings.disableDualChannelAudio !== undefined) {
      this.data.robloxSettings.disableDualChannelAudio = settings.disableDualChannelAudio
    }
    this.save()
  }
}

export const storageService = new StorageService()

