import { invoke } from './invoke'
import { z } from 'zod'

// ============================================================================
// GENERATOR API
// ============================================================================

const successSchema = z.object({ success: z.boolean() })
const accountDataSchema = z.object({ success: z.boolean(), accountData: z.object({ username: z.string(), password: z.string(), birthDate: z.string() }) })
const createAccountSchema = z.object({ success: z.boolean(), accountId: z.string().optional(), error: z.string().optional() })
const accountsListSchema = z.object({ success: z.boolean(), accounts: z.array(z.any()) })
const configSchema = z.object({ success: z.boolean(), config: z.any() })

export const generatorApi = {
  generateAccountData: () => invoke('generator:generate-account-data', accountDataSchema),
  createAccount: () => invoke('generator:create-account', createAccountSchema),
  launchBrowser: () => invoke('generator:launch-browser', z.object({ success: z.boolean(), error: z.string().optional() })),
  fillForm: (accountData: any) => invoke('generator:fill-form', z.object({ success: z.boolean(), error: z.string().optional() }), accountData),
  submitForm: () => invoke('generator:submit-form', z.object({ success: z.boolean(), error: z.string().optional() })),
  closeBrowser: () => invoke('generator:close-browser', z.object({ success: z.boolean(), error: z.string().optional() })),
  generateAndSignup: () => invoke('generator:generate-and-signup', accountDataSchema),
  captchaSolved: () => invoke('generator:captcha-solved', successSchema),
  getAccounts: () => invoke('generator:get-accounts', accountsListSchema),
  clearAccounts: () => invoke('generator:clear-accounts', successSchema),
  updateConfig: (config: any) => invoke('generator:update-config', configSchema, config),
  getConfig: () => invoke('generator:get-config', configSchema),
  getPassword: (accountId: string) => invoke('generator:get-password', z.object({ success: z.boolean(), password: z.string() }), accountId),
  getCookie: (accountId: string) => invoke('generator:get-cookie', z.object({ success: z.boolean(), cookie: z.string() }), accountId)
}
