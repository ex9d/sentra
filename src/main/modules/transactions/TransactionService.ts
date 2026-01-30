import { request, RequestError } from '@main/lib/request'
import {
  transactionTypesSchema,
  transactionsResponseSchema,
  transactionTotalsSchema,
  TransactionTypes,
  TransactionsResponse,
  TransactionTotals,
  TransactionTypeEnum,
  TransactionTimeFrame
} from '@shared/ipc-schemas/transactions'

export class RateLimitError extends Error {
  resetSeconds: number

  constructor(resetSeconds: number) {
    super(`Rate limited. Try again in ${resetSeconds} seconds.`)
    this.name = 'RateLimitError'
    this.resetSeconds = resetSeconds
  }
}

export class TransactionService {



  static async getTransactionTypes(cookie: string, userId: number): Promise<TransactionTypes> {
    try {
      return await request(transactionTypesSchema, {
        url: `https:
        cookie
      })
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 429) {
        const resetHeader = error.headers?.['retry-after'] || error.headers?.['x-ratelimit-reset']
        const resetSeconds = resetHeader
          ? parseInt(Array.isArray(resetHeader) ? resetHeader[0] : resetHeader, 10)
          : 60
        throw new RateLimitError(resetSeconds)
      }
      throw error
    }
  }




  static async getTransactions(
    cookie: string,
    userId: number,
    transactionType: TransactionTypeEnum,
    cursor?: string,
    limit: number = 100
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
      transactionType,
      itemPricingType: 'PaidAndLimited'
    })

    if (cursor) {
      params.set('cursor', cursor)
    }

    try {
      return await request(transactionsResponseSchema, {
        url: `https:
        cookie
      })
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 429) {
        const resetHeader = error.headers?.['retry-after'] || error.headers?.['x-ratelimit-reset']
        const resetSeconds = resetHeader
          ? parseInt(Array.isArray(resetHeader) ? resetHeader[0] : resetHeader, 10)
          : 60
        throw new RateLimitError(resetSeconds)
      }
      throw error
    }
  }





  static async getTransactionTotals(
    cookie: string,
    userId: number,
    timeFrame: TransactionTimeFrame = 'Month'
  ): Promise<TransactionTotals> {


    const usedTypes = 6735032

    try {
      return await request(transactionTotalsSchema, {
        url: `https:
        cookie
      })
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 429) {
        const resetHeader = error.headers?.['retry-after'] || error.headers?.['x-ratelimit-reset']
        const resetSeconds = resetHeader
          ? parseInt(Array.isArray(resetHeader) ? resetHeader[0] : resetHeader, 10)
          : 60
        throw new RateLimitError(resetSeconds)
      }
      throw error
    }
  }
}