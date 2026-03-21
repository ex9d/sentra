import { EventEmitter } from 'events'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import * as crypto from 'crypto'
import { getDataFile } from '../../utils/paths'
import { storageService } from '../system/StorageService'
import { RobloxUserService } from '../users/UserService'
import type { Account } from '../../../renderer/src/types'
// @ts-ignore - imported for use in Account initialization
import { AccountStatus } from '../../../renderer/src/types'
import { RobloxLoginWindowService } from '../auth/RobloxLoginWindowService'
import usernameSniperService from '../sniper/UsernameSniper'

// Helper function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type GeneratedAccountData = {
  id: string
  username: string
  password: string
  birthDate?: string
  createdAt: number
}

export type GeneratorConfig = {
  usernamePrefix: string
  passwordLength: number
  includeSpecialChars: boolean
  autoLaunchBrowser: boolean
}

export type AccountCreationResult = {
  success: boolean
  username?: string
  password?: string
  captchaRequired?: boolean
  error?: string
  timestamp: number
}

export class GeneratorService extends EventEmitter {
  private config: GeneratorConfig = {
    usernamePrefix: 'sentra_',
    passwordLength: 16,
    includeSpecialChars: true,
    autoLaunchBrowser: true
  }

  private createdAccounts: GeneratedAccountData[] = []
  private configPath = getDataFile('generator-config.json')
  private accountsPath = getDataFile('generated-accounts.json')
  private passwordMap: Map<string, string> = new Map() // Store passwords by account ID
  private cookieMap: Map<string, string> = new Map() // Store cookies by account ID
  private browser: any = null
  private page: any = null
  private signupBrowserWindow: any = null // Custom Electron browser window for signup
  private signupBrowserWebContents: any = null // WebContents for injecting JavaScript
  private signupBrowserPartition: string = '' // Partition for cookie access
  private isCreatingAccount: boolean = false // Prevent parallel account creations
  private accountCreationQueue: Array<() => Promise<AccountCreationResult>> = [] // Queue for rapid account creations

  constructor() {
    super()
    this.loadConfig()
    this.loadAccounts()
  }

  /**
   * Encrypt accounts with AES-256-GCM
   */
  private encryptAccounts(accounts: GeneratedAccountData[]): string {
    try {
      // Derive key from app identifier + random salt using PBKDF2
      const salt = crypto.randomBytes(16)
      const key = crypto.pbkdf2Sync('sentra-generator-v1', salt, 100000, 32, 'sha256')
      
      // Generate IV
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

      // Encrypt accounts JSON
      const plaintext = JSON.stringify(accounts)
      let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
      encrypted += cipher.final('hex')

      // Get authentication tag
      const authTag = cipher.getAuthTag()

      // Combine: salt + iv + authTag + encrypted (all hex)
      const combined = salt.toString('hex') + iv.toString('hex') + authTag.toString('hex') + encrypted

      return combined
    } catch (error) {
      console.error('[Generator] Failed to encrypt accounts:', error)
      throw error
    }
  }

  /**
   * Decrypt accounts with AES-256-GCM
   * NO plaintext fallback - always encrypted
   */
  private decryptAccounts(encryptedData: string): GeneratedAccountData[] | null {
    try {
      // Parse: salt (32 hex chars) + iv (24 hex chars) + authTag (32 hex chars) + encrypted data (rest)
      if (encryptedData.length < 88) {
        // Too short to be encrypted data
        return null
      }

      const salt = Buffer.from(encryptedData.substring(0, 32), 'hex')
      const iv = Buffer.from(encryptedData.substring(32, 56), 'hex')
      const authTag = Buffer.from(encryptedData.substring(56, 88), 'hex')
      const encrypted = encryptedData.substring(88)

      // Derive key from app identifier + salt
      const key = crypto.pbkdf2Sync('sentra-generator-v1', salt, 100000, 32, 'sha256')

      // Decrypt
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)

      let plaintext = decipher.update(encrypted, 'hex', 'utf-8')
      plaintext += decipher.final('utf-8')

      const accounts = JSON.parse(plaintext)
      if (Array.isArray(accounts)) {
        return accounts
      }
      return null
    } catch (error) {
      return null
    }
  }


  /**
   * Generate random account data
   */
  generateAccountData(): GeneratedAccountData {
    const username = this.generateUsername()
    const password = this.generatePassword()
    const birthDate = this.generateBirthDate()

    return {
      id: crypto.randomUUID(),
      username,
      password,
      birthDate,
      createdAt: Date.now()
    }
  }

  /**
   * Check if username is available and appropriate using sniper
   */
  async checkUsernameValidity(username: string): Promise<boolean> {
    try {
      const result = await usernameSniperService.checkUsername(username)
      
      // code: 0 = valid/available, 1 = taken, 2 = censored, -1 = error
      if (result.code === 0) {
        console.log(`[Generator] ✓ Username "${username}" is available`)
        return true
      } else if (result.code === 1) {
        console.log(`[Generator] Username "${username}" is already taken`)
        return false
      } else if (result.code === 2) {
        console.log(`[Generator] Username "${username}" is censored`)
        return false
      } else {
        console.log(`[Generator] Could not validate username "${username}": ${result.message}`)
        return false
      }
    } catch (error) {
      console.error(`[Generator] Error checking username "${username}":`, error)
      return false
    }
  }

  /**
   * Generate suitable username (with validity check)
   */
  async generateValidUsername(maxAttempts: number = 10): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const username = this.generateUsername()
      console.log(`[Generator] Checking username: ${username} (attempt ${attempt + 1}/${maxAttempts})`)
      
      const isValid = await this.checkUsernameValidity(username)
      if (isValid) {
        return username
      }
    }
    
    throw new Error(`Failed to generate valid username after ${maxAttempts} attempts`)
  }

  /**
   * Generate random username
   */
  private generateUsername(): string {
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase()
    return `${this.config.usernamePrefix}${randomId}`
  }

  /**
   * Generate random password
   */
  private generatePassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*'

    let chars = uppercase + lowercase + numbers
    if (this.config.includeSpecialChars) {
      chars += specialChars
    }

    let password = ''
    for (let i = 0; i < this.config.passwordLength; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return password
  }

  /**
   * Generate random birth date (13-80 years old)
   */
  private generateBirthDate(): string {
    const now = new Date()
    const minAge = 13
    const maxAge = 80

    const minYear = now.getFullYear() - maxAge
    const maxYear = now.getFullYear() - minAge

    const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear
    const month = Math.floor(Math.random() * 12) + 1
    const day = Math.floor(Math.random() * 28) + 1

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  /**
   * Launch browser and navigate to Roblox signup page
   */
  async launchBrowser(): Promise<void> {
    try {
      // Close any existing browser window first
      if (this.signupBrowserWindow && !this.signupBrowserWindow.isDestroyed()) {
        try {
          this.signupBrowserWindow.close()
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.warn('[Generator] Error closing existing window:', err)
        }
      }

      // Get custom window dimensions from settings
      try {
        const settings = storageService.getSettings()
        const windowWidth = settings.browserWindowWidth ?? 1280
        const windowHeight = settings.browserWindowHeight ?? 800
        console.log('[Generator] Opening signup browser with dimensions:', windowWidth, 'x', windowHeight)
      } catch (settingErr) {
        console.warn('[Generator] Error getting settings, using defaults:', settingErr)
      }

      console.log('[Generator] Attempting to call RobloxLoginWindowService.openSignupBrowser...')
      
      // Open the custom signup browser (with toolbar for captcha evasion)
      try {
        const signupBrowserInfo = await RobloxLoginWindowService.openSignupBrowser(1280, 800)
        this.signupBrowserWindow = signupBrowserInfo.browserWindow
        this.signupBrowserWebContents = signupBrowserInfo.webContents
        this.signupBrowserPartition = signupBrowserInfo.partition

        console.log('[Generator] Custom signup browser opened successfully!')
        console.log('[Generator] BrowserWindow:', this.signupBrowserWindow ? 'exists' : 'null')
        console.log('[Generator] WebContents:', this.signupBrowserWebContents ? 'exists' : 'null')
      } catch (browserErr) {
        console.error('[Generator] FAILED to call openSignupBrowser:', browserErr)
        throw new Error(`Browser service error: ${String(browserErr)}`)
      }
      
      // Wait longer for the React form to fully load and render
      console.log('[Generator] Waiting 4 seconds for signup form to fully load...')
      await new Promise(resolve => setTimeout(resolve, 4000))

      // Debug: Check if form inputs exist and their structure
      try {
        const formDebug = await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const usernameInput = document.getElementById('signup-username')
            const passwordInput = document.getElementById('signup-password')
            const allInputs = Array.from(document.querySelectorAll('input'))
            
            return {
              usernameExists: !!usernameInput,
              passwordExists: !!passwordInput,
              usernameValue: usernameInput?.value || 'NOT FOUND',
              passwordValue: passwordInput?.value || 'NOT FOUND',
              usernameTag: usernameInput?.tagName,
              passwordTag: passwordInput?.tagName,
              usernameOnChange: !!usernameInput?.onchange,
              passwordOnChange: !!passwordInput?.onchange,
              usernameClasses: usernameInput?.className,
              passwordClasses: passwordInput?.className,
              allInputs: allInputs.map(i => ({ 
                id: i.id, 
                name: i.name, 
                type: i.type, 
                value: i.value,
                classes: i.className,
                readonly: i.readOnly,
                disabled: i.disabled
              }))
            }
          })()
        `)
        
        console.log('[Generator] Form structure debug:', JSON.stringify(formDebug, null, 2))
      } catch (debugErr) {
        console.warn('[Generator] Could not debug form structure:', debugErr)
      }
      
      console.log('[Generator] Page fully loaded, ready to auto-fill signup form')
      this.emit('browser-launched')
    } catch (err) {
      console.error('[Generator] Browser launch error:', err)
      console.error('[Generator] Error stack:', err instanceof Error ? err.stack : 'No stack')
      this.emit('browser-error', String(err))
      throw err
    }
  }

  /**
   * Detect which Roblox signup system is being used (old vs new)
   */
  private async detectSignupSystem(): Promise<'old' | 'new'> {
    if (!this.signupBrowserWebContents) {
      throw new Error('Browser not launched')
    }

    try {
      // Check for old system selectors
      const hasOldSystem = await this.signupBrowserWebContents.executeJavaScript(`
        (() => {
          return document.getElementById('MonthDropdown') !== null
        })()
      `)

      if (hasOldSystem) {
        console.log('[Generator] Detected OLD signup system (select elements)')
        return 'old'
      }

      // Check for new system selectors (radix combobox)
      const hasNewSystem = await this.signupBrowserWebContents.executeJavaScript(`
        (() => {
          const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'))
          return buttons.some(btn => btn.getAttribute('aria-label')?.includes('Month'))
        })()
      `)

      if (hasNewSystem) {
        console.log('[Generator] Detected NEW signup system (radix combobox)')
        return 'new'
      }

      throw new Error('Could not detect signup system - page structure unknown')
    } catch (err) {
      console.error('[Generator] Error detecting signup system:', err)
      throw err
    }
  }

  /**
   * Fill the Roblox signup form with account data (handles both old and new systems)
   */
  async fillForm(accountData: GeneratedAccountData): Promise<void> {
    try {
      if (!this.signupBrowserWebContents) {
        throw new Error('Browser not launched')
      }

      console.log('[Generator] Filling signup form...')

      // Detect which system we're using
      const system = await this.detectSignupSystem()

      // Parse birth date (format: YYYY-MM-DD)
      const [year, month, day] = accountData.birthDate!.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthValue = monthNames[parseInt(month) - 1]

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      if (system === 'old') {
        // OLD SYSTEM: Using select dropdowns with IDs
        console.log(`[Generator] Using OLD system selectors`)

        // Select month dropdown
        console.log(`[Generator] Setting birthday month: ${monthValue}`)
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const select = document.getElementById('MonthDropdown')
            if (select) {
              select.focus()
              select.value = '${monthValue}'
              select.dispatchEvent(new Event('input', { bubbles: true }))
              select.dispatchEvent(new Event('change', { bubbles: true }))
              select.blur()
            }
          })()
        `)
        await sleep(500)

        // Select day dropdown
        console.log(`[Generator] Setting birthday day: ${day}`)
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const select = document.getElementById('DayDropdown')
            if (select) {
              select.focus()
              select.value = '${day}'
              select.dispatchEvent(new Event('input', { bubbles: true }))
              select.dispatchEvent(new Event('change', { bubbles: true }))
              select.blur()
            }
          })()
        `)
        await sleep(500)

        // Select year dropdown
        console.log(`[Generator] Setting birthday year: ${year}`)
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const select = document.getElementById('YearDropdown')
            if (select) {
              select.focus()
              select.value = '${year}'
              select.dispatchEvent(new Event('input', { bubbles: true }))
              select.dispatchEvent(new Event('change', { bubbles: true }))
              select.blur()
            }
          })()
        `)
        await sleep(500)
      } else {
        // NEW SYSTEM: Using radix combobox buttons - simulate user clicks
        console.log(`[Generator] Using NEW system selectors (radix combobox)`)

        // For new system, we need to find and click the combobox buttons and then the menu items
        // This is complex because it involves clicking buttons and waiting for menu to appear
        console.log(`[Generator] Setting birthday month: ${monthValue}`)
        
        // Click month button with verification
        const monthBtnClicked = await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const allButtons = Array.from(document.querySelectorAll('button[role="combobox"]'))
            const monthBtn = allButtons.find(btn => btn.getAttribute('aria-label')?.includes('Month'))
            if (monthBtn) {
              monthBtn.click()
              return true
            } else {
              console.log('Month button not found. Available buttons:', allButtons.map(b => b.getAttribute('aria-label')))
              return false
            }
          })()
        `)
        console.log('[Generator] Month button clicked:', monthBtnClicked)
        await sleep(800)
        
        // Find and click the month option
        const monthOptionClicked = await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const allOptions = Array.from(document.querySelectorAll('[role="option"]'))
            const optionTexts = allOptions.map(o => o.textContent?.trim())
            console.log('[DEBUG] All month options:', optionTexts)
            console.log('[DEBUG] Looking for: "${monthValue}"')
            
            // Try exact match first
            let options = allOptions.filter(el => el.textContent?.trim() === '${monthValue}')
            
            // If no exact match, try partial match
            if (options.length === 0) {
              console.log('[DEBUG] No exact match, trying partial match')
              options = allOptions.filter(el => el.textContent?.trim().includes('${monthValue}'))
            }
            
            // If still no match, just click the first option
            if (options.length === 0) {
              console.log('[DEBUG] No partial match either, trying first non-empty option')
              options = allOptions.filter(el => el.textContent?.trim().length > 0).slice(0, 1)
            }
            
            if (options.length > 0) {
              console.log('[DEBUG] Clicking option:', options[0].textContent?.trim())
              options[0].click()
              return { found: true, text: options[0].textContent?.trim() }
            } else {
              console.log('[DEBUG] No options found at all')
              return { found: false, allOptions: optionTexts }
            }
          })()
        `)
        console.log('[Generator] Month option result:', monthOptionClicked)
        await sleep(600)

        // Click day combobox
        console.log(`[Generator] Setting birthday day: ${day}`)
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const dayBtn = Array.from(document.querySelectorAll('button[role="combobox"]')).find(
              btn => btn.getAttribute('aria-label')?.includes('Day')
            )
            if (dayBtn) dayBtn.click()
          })()
        `)
        await sleep(600)
        
        // Find and click the day option (with zero padding)
        const dayFormatted = String(parseInt(day)).padStart(2, '0')
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const options = Array.from(document.querySelectorAll('[role="option"]')).filter(
              el => el.textContent?.trim() === '${dayFormatted}'
            )
            if (options.length > 0) options[0].click()
          })()
        `)
        await sleep(600)

        // Click year combobox
        console.log(`[Generator] Setting birthday year: ${year}`)
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const yearBtn = Array.from(document.querySelectorAll('button[role="combobox"]')).find(
              btn => btn.getAttribute('aria-label')?.includes('Year')
            )
            if (yearBtn) yearBtn.click()
          })()
        `)
        await sleep(600)
        
        // Find and click the year option
        await this.signupBrowserWebContents.executeJavaScript(`
          (() => {
            const options = Array.from(document.querySelectorAll('[role="option"]')).filter(
              el => el.textContent?.trim() === '${year}'
            )
            if (options.length > 0) options[0].click()
          })()
        `)
        await sleep(600)
      }

      // Fill username - try direct value injection without intermediate events
      console.log(`[Generator] Filling username: ${accountData.username}`)
      const usernameResult = await this.signupBrowserWebContents.executeJavaScript(`
        (() => {
          const input = document.getElementById('signup-username')
          if (input) {
            // Direct method: set the value and immediately trigger events
            const text = '${accountData.username}'
            
            // Get the input's setter via Object.getOwnPropertyDescriptor
            const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
            if (descriptor && descriptor.set) {
              descriptor.set.call(input, text)
            } else {
              input.value = text
            }
            
            // Trigger all necessary events in quick succession
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            
            // Return what's in the field
            return { filledValue: input.value }
          }
          return { filledValue: 'INPUT_NOT_FOUND' }
        })()
      `)
      console.log('[Generator] Username fill result:', usernameResult)
      await sleep(500)

      // Fill password - use same direct value injection method as username
      console.log(`[Generator] Filling password`)
      const passwordResult = await this.signupBrowserWebContents.executeJavaScript(`
        (() => {
          const input = document.getElementById('signup-password')
          if (input) {
            // Direct method: set the value and immediately trigger events
            const text = '${accountData.password}'
            
            // Get the input's setter via Object.getOwnPropertyDescriptor
            const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
            if (descriptor && descriptor.set) {
              descriptor.set.call(input, text)
            } else {
              input.value = text
            }
            
            // Trigger all necessary events in quick succession
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            
            // Return what's in the field
            return { filledValue: input.value }
          }
          return { filledValue: 'INPUT_NOT_FOUND' }
        })()
      `)
      console.log('[Generator] Password fill result:', passwordResult)
      await sleep(500)

      console.log('[Generator] Form filled successfully')
      
      // Verify the form values persisted
      const verifyValues = await this.signupBrowserWebContents.executeJavaScript(`
        (() => {
          const username = document.getElementById('signup-username')?.value || ''
          const password = document.getElementById('signup-password')?.value || ''
          const month = document.getElementById('MonthDropdown')?.value || document.querySelector('button[role="combobox"][aria-label*="Month"]')?.textContent || ''
          return { username, password, month }
        })()
      `)
      console.log('[Generator] Form verification:', verifyValues)
      
      this.emit('form-filled', accountData)
    } catch (err) {
      console.error('[Generator] Form fill error:', err)
      this.emit('form-error', String(err))
      throw err
    }
  }

  /**
   * Submit the signup form by clicking the signup button (handles both old and new systems)
   */
  async submitForm(): Promise<void> {
    try {
      if (!this.signupBrowserWebContents) {
        throw new Error('Browser not launched')
      }

      console.log('[Generator] Waiting for submit button to become enabled...')
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // Helper to safely execute JavaScript - checks if webContents still exists
      const safeExecute = async (code: string, label: string) => {
        try {
          if (!this.signupBrowserWebContents) {
            throw new Error('WebContents is null - browser was closed')
          }
          return await this.signupBrowserWebContents.executeJavaScript(code)
        } catch (err) {
          console.error(`[Generator] Error during "${label}":`, err)
          throw err
        }
      }

      // Try old system first
      let oldSubmitExists = false
      try {
        oldSubmitExists = await safeExecute(`
          (() => {
            return document.getElementById('signup-button') !== null
          })()
        `, 'checking old submit button')
      } catch (err) {
        console.warn('[Generator] Could not check for old submit button:', err)
        return // Browser was closed, exit gracefully
      }
      
      if (oldSubmitExists) {
        console.log('[Generator] Found OLD system submit button (#signup-button)')
        
        // Wait up to 10 seconds for button to be enabled
        let isEnabled = false
        let attempts = 0
        while (!isEnabled && attempts < 20) {
          try {
            isEnabled = await safeExecute(`
              (() => {
                const btn = document.getElementById('signup-button')
                return btn && !btn.hasAttribute('disabled') && btn.offsetHeight > 0
              })()
            `, 'checking button enabled status')
          } catch (err) {
            console.warn('[Generator] Button check failed, assuming closed:', err)
            return
          }
          if (!isEnabled) {
            await sleep(500)
            attempts++
          }
        }
        
        if (!isEnabled) {
          console.warn('[Generator] Button did not become enabled after 10 seconds, trying anyway...')
        } else {
          console.log('[Generator] Button is now enabled')
        }
        
        console.log('[Generator] Clicking signup button...')
        try {
          await safeExecute(`
            (() => {
              const btn = document.getElementById('signup-button')
              if (btn) btn.click()
            })()
          `, 'clicking old submit button')
        } catch (err) {
          console.warn('[Generator] Failed to click submit button:', err)
          return
        }
      } else {
        // Try new system - submit button with type="submit"
        console.log('[Generator] Looking for NEW system submit button (button[type="submit"])')
        
        // Wait up to 10 seconds for button to be enabled
        let isEnabled = false
        let attempts = 0
        while (!isEnabled && attempts < 20) {
          try {
            isEnabled = await safeExecute(`
              (() => {
                const btn = document.querySelector('button[type="submit"]')
                return btn && !btn.hasAttribute('disabled') && !btn.classList.contains('disabled') && btn.offsetHeight > 0
              })()
            `, 'checking new button enabled status')
          } catch (err) {
            console.warn('[Generator] Button check failed, assuming closed:', err)
            return
          }
          if (!isEnabled) {
            await sleep(500)
            attempts++
          }
        }
        
        if (!isEnabled) {
          console.warn('[Generator] Button did not become enabled after 10 seconds, trying anyway...')
        } else {
          console.log('[Generator] Button is now enabled')
        }
        
        console.log('[Generator] Clicking submit button...')
        try {
          await safeExecute(`
            (() => {
              const btn = document.querySelector('button[type="submit"]')
              if (btn) btn.click()
            })()
          `, 'clicking new submit button')
        } catch (err) {
          console.warn('[Generator] Failed to click new submit button:', err)
          return
        }
      }

      // Wait for response or navigation
      await sleep(2000)

      console.log('[Generator] Form submitted')
      this.emit('form-submitted')
    } catch (err) {
      console.error('[Generator] Form submission error:', err)
      this.emit('submit-error', String(err))
      throw err
    }
  }

  /**
   * Close the signup browser (custom Electron window only)
   */
  async closeBrowser(): Promise<void> {
    try {
      // Close custom signup window if open
      if (this.signupBrowserWindow && !this.signupBrowserWindow.isDestroyed()) {
        try {
          this.signupBrowserWindow.close()
          console.log('[Generator] Signup browser window closed')
        } catch (err) {
          console.warn('[Generator] Error closing signup window:', err)
        }
        this.signupBrowserWindow = null
        this.signupBrowserWebContents = null
        this.signupBrowserPartition = ''
      }

      // Give the OS time to fully release resources
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('[Generator] Browser fully closed')
      this.emit('browser-closed')
    } catch (err) {
      console.error('[Generator] Error closing browser:', err)
    }
  }

  /**
   * Full signup workflow: generate data, launch browser, fill form, submit
   */
  async generateAndSignup(): Promise<GeneratedAccountData> {
    try {
      // Generate account data
      const accountData = this.generateAccountData()
      console.log('[Generator] Generated account data:', {
        username: accountData.username,
        birthDate: accountData.birthDate
      })

      // Launch browser
      await this.launchBrowser()

      // Fill form
      await this.fillForm(accountData)

      // Auto-click the signup button immediately after filling
      console.log('[Generator] Auto-clicking signup button immediately after filling form...')
      await this.submitForm()

      // Monitor for .ROBLOSECURITY cookie instead of waiting for captcha timeout
      console.log('[Generator] Monitoring for .ROBLOSECURITY cookie (max 5 minutes)...')
      console.log('[Generator] >>> PLEASE COMPLETE THE CAPTCHA IN THE BROWSER WINDOW <<<')
      this.emit('waiting-for-captcha', { message: 'Please complete the captcha in the browser window. Account will be added when logged in.' })

      // Poll for cookie until it appears
      let robloxSecurityCookie = ''
      let cookieFound = false
      let pollAttempts = 0
      const maxPollAttempts = 600 // 5 minutes max (500ms * 600)
      
      while (!cookieFound && pollAttempts < maxPollAttempts) {
        try {
          if (this.signupBrowserPartition) {
            const { session } = require('electron')
            const signupSession = session.fromPartition(this.signupBrowserPartition)
            const cookies = await signupSession.cookies.get({ name: '.ROBLOSECURITY' })
            if (cookies && cookies.length > 0) {
              robloxSecurityCookie = cookies[0].value
              cookieFound = true
              console.log('[Generator] ✓ .ROBLOSECURITY cookie detected! Account created successfully')
              break
            }
          }
        } catch (err) {}
        
        pollAttempts++
        if (pollAttempts % 20 === 0) {
          console.log('[Generator] Still waiting for cookie... (', Math.round(pollAttempts * 0.5), 's elapsed)')
        }
        await sleep(500)
      }

      if (!cookieFound) {
        console.warn('[Generator] Timeout waiting for cookie (5 minutes elapsed)')
      }

      // Add account to storage with the cookie we found (or empty string if not found)
      console.log('[Generator] Adding account to storage...')
      await this.addAccountToStorage(accountData, robloxSecurityCookie, false)

      console.log('[Generator] Account signup workflow completed successfully')
      this.emit('signup-completed', accountData)

      return accountData
    } catch (err) {
      console.error('[Generator] Signup workflow error:', err)
      // Close browser on error
      await this.closeBrowser()
      this.emit('signup-error', String(err))
      throw err
    }
  }

  /**
   * Add generated account to storage (both generator storage and main accounts)
   */
  private async addAccountToStorage(accountData: GeneratedAccountData, cookie: string, fromSniper: boolean = false): Promise<void> {
    try {
      // Generate ID and store password + cookie
      const accountId = randomUUID()
      accountData.id = accountId // Add ID to account data
      this.passwordMap.set(accountId, accountData.password)
      this.cookieMap.set(accountId, cookie)
      
      // Store in generator's own storage
      this.createdAccounts.push(accountData)
      this.persistAccounts()
      
      console.log('[Generator] Account stored in generator storage:', accountData.username, 'ID:', accountId)
      
      // If from sniper, add to sniper-generated accounts list
      if (fromSniper) {
        try {
          // Create Account object from GeneratedAccountData
          const newAccount: Account = {
            id: accountId,
            displayName: accountData.username,
            username: accountData.username,
            userId: '', // Will be empty until they login
            cookie: cookie || undefined,
            password: accountData.password, // Password stored plaintext - encrypted at JSON level by StorageService
            status: AccountStatus.Offline,
            importedVia: 'cookie',
            avatarUrl: '',
            lastActive: new Date().toISOString(),
            robuxBalance: 0,
            friendCount: 0,
            followerCount: 0,
            followingCount: 0,
            isPremium: false,
            isAdmin: false,
            notes: ''
          }
          
          storageService.addSniperAccount(newAccount)
          console.log('[Generator] Account added to Sniper Generated list:', accountData.username)
        } catch (err) {
          console.warn('[Generator] Failed to add account to sniper storage:', err)
        }
      }
      
      // Optionally emit event for UI to know a new account was created
      this.emit('account-created', { accountId, username: accountData.username })
      
      // Close signup browser
      console.log('[Generator] Closing signup browser...')
      if (this.signupBrowserWindow && !this.signupBrowserWindow.isDestroyed()) {
        try {
          this.signupBrowserWindow.close()
          this.signupBrowserWindow = null
          this.signupBrowserWebContents = null
        } catch (err) {
          console.warn('[Generator] Error closing signup window:', err)
        }
      }
      
      console.log('[Generator] Signup browser closed')
    } catch (err) {
      console.error('[Generator] Failed to add account to storage:', err)
      this.emit('storage-error', String(err))
    }
  }

  /**
   * Create account (end-to-end)
   */
  async createAccount(): Promise<AccountCreationResult> {
    try {
      console.log('[Generator] Starting account creation...')

      // Generate and validate username
      let accountData: GeneratedAccountData
      try {
        console.log('[Generator] Generating valid username...')
        const validUsername = await this.generateValidUsername(10)
        accountData = this.generateAccountData()
        accountData.username = validUsername
        console.log(`[Generator] Generated valid account: ${accountData.username}`)
      } catch (error) {
        console.error('[Generator] Failed to generate valid username:', error)
        return {
          success: false,
          error: String(error),
          timestamp: Date.now()
        }
      }

      return await this.processAccountCreation(accountData)
    } catch (error) {
      return {
        success: false,
        error: String(error),
        timestamp: Date.now()
      }
    }
  }

  async createAccountWithUsername(username: string): Promise<AccountCreationResult> {
    return new Promise((resolve) => {
      // Add this creation task to the queue
      this.accountCreationQueue.push(async () => {
        try {
          console.log(`[Generator] Starting AUTO-GENERATE account creation with username: ${username} (from sniper)`)
          console.log(`[Generator] Queue length: ${this.accountCreationQueue.length}`)

          // Create account data with the provided username
          const password = this.generatePassword()
          const birthDate = this.generateBirthDate()

          const accountData: GeneratedAccountData = {
            id: randomUUID(),
            username,
            password,
            birthDate,
            createdAt: Date.now()
          }

          console.log(`[Generator] Created account data: ${accountData.username}`)

          // For sniper auto-generate, use the FULL process with browser (forceLaunchBrowser=true)
          // This will launch browser, fill form, submit, and add to accounts AND sniper storage
          return await this.processAccountCreation(accountData, true, true)
        } catch (error) {
          console.error(`[Generator] CRITICAL ERROR in createAccountWithUsername:`, error)
          return {
            success: false,
            error: String(error),
            timestamp: Date.now()
          }
        }
      })

      // Process the queue
      this.processAccountCreationQueue().then(resolve).catch((error) => {
        console.error('[Generator] Queue processing error:', error)
        resolve({
          success: false,
          error: String(error),
          timestamp: Date.now()
        })
      })
    })
  }

  private async processAccountCreationQueue(): Promise<AccountCreationResult> {
    // If already processing, wait
    if (this.isCreatingAccount) {
      console.log('[Generator] Account creation in progress, queuing...')
      return new Promise((resolve) => {
        const checkQueue = setInterval(async () => {
          if (!this.isCreatingAccount) {
            clearInterval(checkQueue)
            resolve(await this.processAccountCreationQueue())
          }
        }, 100)
      })
    }

    // If no queued tasks, return
    if (this.accountCreationQueue.length === 0) {
      return {
        success: true,
        timestamp: Date.now()
      }
    }

    // Process next task
    this.isCreatingAccount = true
    const task = this.accountCreationQueue.shift()

    try {
      if (task) {
        return await task()
      }
      return {
        success: false,
        error: 'No task available',
        timestamp: Date.now()
      }
    } finally {
      this.isCreatingAccount = false
      // Process next item in queue if available
      if (this.accountCreationQueue.length > 0) {
        return this.processAccountCreationQueue()
      }
    }
  }

  private async processAccountCreation(accountData: GeneratedAccountData, forceLaunchBrowser: boolean = false, fromSniper: boolean = false): Promise<AccountCreationResult> {
    try {
      // Launch browser if enabled or forced (from sniper auto-generate)
      if (forceLaunchBrowser || this.config.autoLaunchBrowser) {
        console.log('[Generator] Launching browser for account creation (forceLaunchBrowser=' + forceLaunchBrowser + ')')
        try {
          await this.launchBrowser()
          console.log('[Generator] Browser launched successfully!')
        } catch (launchErr) {
          console.error('[Generator] CRITICAL: Failed to launch browser:', launchErr)
          throw new Error(`Failed to launch browser: ${String(launchErr)}`)
        }
      } else {
        console.warn('[Generator] Browser launch disabled and not forced - will not create account')
        throw new Error('Browser not launched - autoLaunchBrowser is false')
      }

      // Fill form
      try {
        console.log('[Generator] Filling form...')
        await this.fillForm(accountData)
        console.log('[Generator] Form filled successfully!')
      } catch (fillErr) {
        console.error('[Generator] Failed to fill form:', fillErr)
        throw fillErr
      }

      // Submit form
      try {
        console.log('[Generator] Submitting form...')
        await this.submitForm()
        console.log('[Generator] Form submitted!')
      } catch (submitErr) {
        console.error('[Generator] Failed to submit form:', submitErr)
        throw submitErr
      }

      // Monitor for .ROBLOSECURITY cookie
      console.log('[Generator] Monitoring for .ROBLOSECURITY cookie...')
      let robloxSecurityCookie = ''
      let cookieFound = false
      let pollAttempts = 0
      const maxPollAttempts = 600 // 5 minutes max
      
      while (!cookieFound && pollAttempts < maxPollAttempts) {
        try {
          if (this.signupBrowserPartition) {
            const { session } = require('electron')
            const signupSession = session.fromPartition(this.signupBrowserPartition)
            const cookies = await signupSession.cookies.get({ name: '.ROBLOSECURITY' })
            if (cookies && cookies.length > 0) {
              robloxSecurityCookie = cookies[0].value
              cookieFound = true
              console.log('[Generator] ✓ Cookie extracted successfully')
              break
            }
          }
        } catch (err) {}
        
        pollAttempts++
        if (pollAttempts % 20 === 0) {
          console.log('[Generator] Still waiting for cookie... (', Math.round(pollAttempts * 0.5), 's elapsed)')
        }
        await sleep(500)
      }

      // Add account to storage (closes signup browser and opens real browser)
      try {
        await this.addAccountToStorage(accountData, robloxSecurityCookie, fromSniper)
      } catch (storageErr) {
        console.error('[Generator] Failed to add account to storage:', storageErr)
        // Don't fail entirely if storage fails
      }

      console.log(`[Generator] Account created successfully: ${accountData.username}`)

      return {
        success: true,
        username: accountData.username,
        password: accountData.password,
        timestamp: Date.now()
      }
    } catch (err) {
      console.error('[Generator] Account creation error:', err)
      await this.closeBrowser()

      return {
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  }



  /**
   * Update config
   */
  updateConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config }
    this.saveConfig()
    console.log('[Generator] Config updated:', this.config)
    this.emit('config-updated', this.config)
  }

  /**
   * Get config
   */
  getConfig(): GeneratorConfig {
    return { ...this.config }
  }

  /**
   * Get password for an account ID
   */
  getPassword(accountId: string): string {
    return this.passwordMap.get(accountId) || ''
  }

  /**
   * Get cookie for an account ID
   */
  getCookie(accountId: string): string {
    return this.cookieMap.get(accountId) || ''
  }

  /**
   * Save config to file
   */
  private saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (err) {
      console.error('[Generator] Failed to save config:', err)
    }
  }

  /**
   * Load config from file
   */
  private loadConfig(): void {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf-8')
        const loaded = JSON.parse(data)
        this.config = { ...this.config, ...loaded }
        console.log('[Generator] Config loaded')
      }
    } catch (err) {
      console.error('[Generator] Failed to load config:', err)
    }
  }

  /**
   * Get all created accounts
   */
  getAccounts(): GeneratedAccountData[] {
    return [...this.createdAccounts] // Return a copy
  }

  /**
   * Clear all created accounts
   */
  clearAccounts(): void {
    this.createdAccounts = []
    this.passwordMap.clear()
    this.persistAccounts()
    console.log('[Generator] All accounts cleared')
  }

  /**
   * Delete a single created account by ID
   */
  deleteAccount(accountId: string): boolean {
    const initialLength = this.createdAccounts.length
    this.createdAccounts = this.createdAccounts.filter(acc => acc.id !== accountId)
    
    if (this.createdAccounts.length < initialLength) {
      this.passwordMap.delete(accountId)
      this.cookieMap.delete(accountId)
      this.persistAccounts()
      console.log('[Generator] Account deleted:', accountId)
      return true
    }
    return false
  }

  /**
   * Persist accounts to file (encrypted)
   */
  private persistAccounts(): void {
    try {
      const encrypted = this.encryptAccounts(this.createdAccounts)
      writeFileSync(this.accountsPath, encrypted)
      console.log('[Generator] Persisted', this.createdAccounts.length, 'encrypted accounts to file')
    } catch (err) {
      console.error('[Generator] Failed to save accounts:', err)
    }
  }

  /**
   * Load accounts from file (encrypted)
   */
  private loadAccounts(): void {
    try {
      if (existsSync(this.accountsPath)) {
        const data = readFileSync(this.accountsPath, 'utf-8')
        const decrypted = this.decryptAccounts(data)
        if (decrypted) {
          this.createdAccounts = decrypted
          console.log(`[Generator] Loaded ${this.createdAccounts.length} decrypted accounts`)
        } else {
          console.warn('[Generator] Failed to decrypt accounts, defaulting to empty array')
          this.createdAccounts = []
        }
      }
    } catch (err) {
      console.error('[Generator] Failed to load accounts:', err)
      this.createdAccounts = []
    }
  }
}

export const generatorService = new GeneratorService()
