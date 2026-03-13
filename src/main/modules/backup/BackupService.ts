import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getDataFile } from '../../utils/paths'

export interface BackupData {
  version: string
  createdAt: string
  accounts: any[]
  settings?: any
}

export class AccountBackupService {
  private static readonly BACKUP_DIR = getDataFile('Backups')

  /**
   * Create encrypted backup file with accounts
   * @param savePath - Optional custom path to save the backup file. If not provided, uses default Backups directory
   */
  static async createBackup(accounts: any[], backupPin: string, savePath?: string): Promise<string> {
    try {
      backupPin = String(backupPin || '')
      
      let filepath: string

      if (savePath) {
        // Use custom save path provided by user
        filepath = savePath
        // Ensure the directory exists
        const dir = path.dirname(filepath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      } else {
        // Use default backup directory
        if (!fs.existsSync(this.BACKUP_DIR)) {
          fs.mkdirSync(this.BACKUP_DIR, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `sentra-backup-${timestamp}.bak`
        filepath = path.join(this.BACKUP_DIR, filename)
      }

      const backupData: BackupData = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        accounts: accounts
      }

      const jsonData = JSON.stringify(backupData)

      const encrypted = this.encryptData(jsonData, backupPin)

      fs.writeFileSync(filepath, encrypted, 'utf-8')

      console.debug && console.debug('[BackupService] Backup created:', filepath)
      return filepath
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[BackupService] Failed to create backup:', errorMsg)
      throw new Error(errorMsg)
    }
  }

  /**
   * Restore accounts from encrypted backup file
   */
  static async restoreBackup(filepath: string, backupPin: string): Promise<any[]> {
    try {
      backupPin = String(backupPin || '')
      
      if (!fs.existsSync(filepath)) {
        throw new Error('Backup file not found: ' + filepath)
      }

      const encrypted = fs.readFileSync(filepath, 'utf-8')

      const jsonData = this.decryptData(encrypted, backupPin)

      const backupData: BackupData = JSON.parse(jsonData)

      if (!Array.isArray(backupData.accounts)) {
        throw new Error('Invalid backup format: accounts list missing')
      }

      // Normalize accounts to ensure required fields exist and types match expectations
      const normalized = backupData.accounts.map((a: any) => {
        const id = a?.id ?? a?.uuid ?? a?.uid ?? crypto.randomUUID()
        const displayName = a?.displayName ?? a?.display_name ?? a?.name ?? ''
        const username = a?.username ?? a?.user ?? a?.handle ?? ''
        const userId = a?.userId ?? a?.user_id ?? a?.uid ?? ''

        const normalizedAccount = {
          ...a,
          id: String(id),
          displayName: String(displayName),
          username: String(username),
          userId: String(userId)
        }

        return normalizedAccount
      })

      console.debug && console.debug('[BackupService] Normalized accounts count:', normalized.length)

      return normalized
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[BackupService] Failed to restore backup:', errorMsg)
      throw new Error(errorMsg)
    }
  }

  /**
   * Encrypt data using PIN as key
   * Produces base64:base64 (IV:cipher) for safe text storage.
   */
  private static encryptData(data: string, pin: string): string {
    try {
      const salt = 'sentra-backup-salt-v1'
      const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256')

      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

      const encryptedBuf = Buffer.concat([cipher.update(Buffer.from(data, 'utf-8')), cipher.final()])

      const combined = iv.toString('base64') + ':' + encryptedBuf.toString('base64')
      return combined
    } catch (error) {
      throw new Error('Encryption failed: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  /**
   * Decrypt data using PIN as key
   * Supports legacy hex:hex (IV:cipher) and new base64:base64 formats.
   */
  private static decryptData(combined: string, pin: string): string {
    try {
      // Do not log PIN or derived key for security

      const idx = combined.indexOf(':')
      if (idx === -1) throw new Error('Invalid backup file format')
      const ivPart = combined.substring(0, idx)
      const encryptedPart = combined.substring(idx + 1)

      if (!ivPart || !encryptedPart) throw new Error('Invalid backup file format')

      const isHex = /^[0-9a-fA-F]+$/.test(ivPart) && (ivPart.length % 2 === 0)

      const salt = 'sentra-backup-salt-v1'
      const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256')

      if (isHex) {
        const iv = Buffer.from(ivPart, 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        let decrypted = decipher.update(encryptedPart, 'hex', 'utf-8')
        decrypted += decipher.final('utf-8')
        console.debug && console.debug('[BackupService] Successfully decrypted (hex)')
        return decrypted
      } else {
        const iv = Buffer.from(ivPart, 'base64')
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        let decrypted = decipher.update(encryptedPart, 'base64', 'utf-8')
        decrypted += decipher.final('utf-8')
        console.debug && console.debug('[BackupService] Successfully decrypted (base64)')
        return decrypted
      }
    } catch (error) {
      console.error('[BackupService] Decryption error:', error)
      throw new Error('Invalid PIN or corrupted backup file')
    }
  }
}
