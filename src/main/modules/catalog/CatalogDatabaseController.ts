import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { catalogDatabaseService } from './CatalogDatabaseService'




export const registerCatalogDatabaseHandlers = (): void => {

  handle('get-catalog-db-status', z.tuple([]), async () => {
    return catalogDatabaseService.getStatus()
  })


  handle('download-catalog-db', z.tuple([]), async () => {
    return catalogDatabaseService.downloadDatabase()
  })


  handle('get-all-catalog-items', z.tuple([]), async () => {
    return catalogDatabaseService.getAllItems()
  })


  handle('get-catalog-index-export', z.tuple([]), async () => {
    return catalogDatabaseService.getExportedIndex()
  })


  handle(
    'search-catalog-db',
    z.tuple([z.string(), z.number().optional()]),
    async (_, query, limit) => {
      return catalogDatabaseService.searchByName(query, limit)
    }
  )


  handle('get-catalog-item-by-id', z.tuple([z.number()]), async (_, assetId) => {
    return catalogDatabaseService.getItemById(assetId)
  })


  handle('get-sales-data', z.tuple([z.number()]), async (_, assetId) => {
    return catalogDatabaseService.getSalesData(assetId)
  })


  handle('get-batch-sales-data', z.tuple([z.array(z.number())]), async (_, assetIds) => {
    return catalogDatabaseService.getBatchSalesData(assetIds)
  })


  handle('get-catalog-item-count', z.tuple([]), async () => {
    return catalogDatabaseService.getItemCount()
  })
}