import { ipcMain } from 'electron'
import { generatorService, GeneratorConfig } from './GeneratorService'
import { storageService } from '../system/StorageService'

export function registerGeneratorHandlers(): void {
  // Generate account data
  ipcMain.handle('generator:generate-account-data', () => {
    const accountData = generatorService.generateAccountData()
    return { success: true, accountData }
  })

  // Create account (full process)
  ipcMain.handle('generator:create-account', async () => {
    const result = await generatorService.createAccount()
    return result
  })

  // Launch browser
  ipcMain.handle('generator:launch-browser', async () => {
    try {
      await generatorService.launchBrowser()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Fill form
  ipcMain.handle('generator:fill-form', async (_event, accountData: any) => {
    try {
      await generatorService.fillForm(accountData)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Submit form
  ipcMain.handle('generator:submit-form', async () => {
    try {
      await generatorService.submitForm()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Close browser
  ipcMain.handle('generator:close-browser', async () => {
    try {
      await generatorService.closeBrowser()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Full signup workflow (generate, launch browser, fill, submit with captcha wait)
  ipcMain.handle('generator:generate-and-signup', async () => {
    try {
      const accountData = await generatorService.generateAndSignup()
      return { success: true, accountData }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Get created accounts (from generator's own storage)
  ipcMain.handle('generator:get-accounts', () => {
    const accounts = generatorService.getAccounts()
    return { success: true, accounts }
  })

  // Clear accounts (from generator's own storage)
  ipcMain.handle('generator:clear-accounts', () => {
    generatorService.clearAccounts()
    return { success: true }
  })

  // Update config
  ipcMain.handle('generator:update-config', (_event, config: Partial<GeneratorConfig>) => {
    generatorService.updateConfig(config)
    return { success: true, config: generatorService.getConfig() }
  })

  // Get config
  ipcMain.handle('generator:get-config', () => {
    return { success: true, config: generatorService.getConfig() }
  })

  // Get password for an account ID
  ipcMain.handle('generator:get-password', (_event, accountId: string) => {
    const password = generatorService.getPassword(accountId)
    return { success: true, password }
  })

  // Get cookie for an account ID
  ipcMain.handle('generator:get-cookie', (_event, accountId: string) => {
    const cookie = generatorService.getCookie(accountId)
    return { success: true, cookie }
  })
}
