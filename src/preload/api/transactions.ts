import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// TRANSACTIONS API
// ============================================================================

export const transactionsApi = {
  getTransactionTypes: (cookie: string) =>
    invoke('get-transaction-types', S.transactionTypesSchema, cookie),

  getTransactions: (
    cookie: string,
    transactionType: S.TransactionTypeEnum,
    cursor?: string,
    limit?: number
  ) =>
    invoke(
      'get-transactions',
      S.transactionsResponseSchema,
      cookie,
      transactionType,
      cursor,
      limit
    ),

  getTransactionTotals: (cookie: string, timeFrame?: S.TransactionTimeFrame) =>
    invoke('get-transaction-totals', S.transactionTotalsSchema, cookie, timeFrame)
}
