export interface SalesItem {
  id: number
  sales: number
}




export async function getSalesData(assetId: number): Promise<SalesItem | null> {
  try {
    const result = await window.api.getSalesData(assetId)
    return result
  } catch (error) {
    console.error('[salesData] Failed to get sales data:', error)
    return null
  }
}




export async function getBatchSalesData(assetIds: number[]): Promise<Map<number, SalesItem>> {
  try {
    const result = await window.api.getBatchSalesData(assetIds)
    const salesMap = new Map<number, SalesItem>()
    for (const [assetIdStr, sales] of Object.entries(result)) {
      const assetId = parseInt(assetIdStr, 10)
      if (!isNaN(assetId)) {
        salesMap.set(assetId, { id: assetId, sales: sales as number })
      }
    }
    return salesMap
  } catch (error) {
    console.error('[salesData] Failed to get batch sales data:', error)
    return new Map()
  }
}





export async function hasSalesData(assetId: number): Promise<boolean> {
  const data = await getSalesData(assetId)
  return data !== null
}

export function formatNumber(num: number): string {
  return num.toLocaleString()
}