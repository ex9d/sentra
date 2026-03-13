import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from '../users/UserService'
import { TransactionService } from './TransactionService'
import {
  transactionTypeEnumSchema,
  transactionTimeFrameSchema
} from '@shared/ipc-schemas/transactions'

/**
 * Registers transaction-related IPC handlers
 */
export const registerTransactionHandlers = (): void => {
  handle('get-transaction-types', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)
    return TransactionService.getTransactionTypes(cookie, authData.id)
  })

  handle(
    'get-transactions',
    z.tuple([z.string(), transactionTypeEnumSchema, z.string().optional(), z.number().optional()]),
    async (_, cookieRaw, transactionType, cursor, limit) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      const authData = await RobloxUserService.getAuthenticatedUser(cookie)
      return TransactionService.getTransactions(cookie, authData.id, transactionType, cursor, limit)
    }
  )

  handle(
    'get-transaction-totals',
    z.tuple([z.string(), transactionTimeFrameSchema.optional()]),
    async (_, cookieRaw, timeFrame) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      const authData = await RobloxUserService.getAuthenticatedUser(cookie)
      return TransactionService.getTransactionTotals(cookie, authData.id, timeFrame || 'Month')
    }
  )
}
