





import FlexSearch from 'flexsearch'


interface CatalogItem {
  AssetId: number
  Name: string
  Description: string
  AssetTypeId: number
  IsLimited: boolean
  IsLimitedUnique: boolean
  PriceInRobux: number
  IsForSale: boolean
  Sales: number
}

interface RolimonsItem {
  id: number
  name: string
  acronym: string
  rap: number
  value: number | null
  demand: number
  demandLabel: string
  trend: number
  trendLabel: string
  isProjected: boolean
  isHyped: boolean
  isRare: boolean
}


interface ExportedIndexData {
  version: number
  catalogHash: string
  catalogIndex: unknown
  catalogItems: [number, CatalogItem][]
}


type WorkerMessage =
  | { type: 'INIT_CATALOG'; items: CatalogItem[] }
  | { type: 'INIT_ROLIMONS'; items: Record<string, unknown[]> }
  | { type: 'IMPORT_CATALOG_INDEX'; data: ExportedIndexData }
  | { type: 'EXPORT_CATALOG_INDEX'; hash: string }
  | { type: 'SEARCH_CATALOG'; query: string; maxResults?: number }
  | { type: 'SEARCH_ROLIMONS'; query: string; maxResults?: number }
  | { type: 'SEARCH_ALL'; query: string; maxResults?: number }
  | { type: 'GET_STATUS' }

type WorkerResponse =
  | { type: 'CATALOG_INDEXED'; count: number }
  | { type: 'ROLIMONS_INDEXED'; count: number }
  | { type: 'CATALOG_RESULTS'; results: CatalogItem[]; query: string }
  | { type: 'ROLIMONS_RESULTS'; results: RolimonsItem[]; query: string }
  | { type: 'ALL_RESULTS'; catalog: CatalogItem[]; rolimons: RolimonsItem[]; query: string }
  | {
      type: 'STATUS'
      catalogReady: boolean
      rolimonsReady: boolean
      catalogCount: number
      rolimonsCount: number
    }
  | { type: 'CATALOG_INDEX_EXPORTED'; data: ExportedIndexData }
  | { type: 'CATALOG_INDEX_IMPORTED'; count: number }
  | { type: 'ERROR'; message: string }


const INDEX_VERSION = 1


const DEMAND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Terrible',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Amazing'
}


const TREND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Lowering',
  1: 'Unstable',
  2: 'Stable',
  3: 'Raising',
  4: 'Fluctuating'
}


let catalogNameIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100
})

const rolimonsNameIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100
})

const rolimonsAcronymIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100
})


const catalogItems = new Map<number, CatalogItem>()
const rolimonsItems = new Map<number, RolimonsItem>()

let catalogReady = false
let rolimonsReady = false


function parseRolimonsItem(id: number, data: unknown[]): RolimonsItem {
  const demand = (data[5] as number) ?? -1
  const trend = (data[6] as number) ?? -1
  const value = data[3] as number

  return {
    id,
    name: (data[0] as string) || '',
    acronym: (data[1] as string) || '',
    rap: (data[2] as number) || 0,
    value: value === -1 ? null : value,
    demand,
    demandLabel: DEMAND_LABELS[demand] || 'Unknown',
    trend,
    trendLabel: TREND_LABELS[trend] || 'Unknown',
    isProjected: data[7] === 1,
    isHyped: data[8] === 1,
    isRare: data[9] === 1
  }
}


self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  try {
    switch (message.type) {
      case 'INIT_CATALOG': {
        catalogItems.clear()

        catalogNameIndex = new FlexSearch.Index({
          tokenize: 'forward',
          cache: 100
        })
        const items = message.items


        for (const item of items) {
          catalogItems.set(item.AssetId, item)
          catalogNameIndex.add(item.AssetId, item.Name)
        }

        catalogReady = true
        const response: WorkerResponse = { type: 'CATALOG_INDEXED', count: catalogItems.size }
        self.postMessage(response)
        break
      }

      case 'IMPORT_CATALOG_INDEX': {
        const { data } = message


        if (data.version !== INDEX_VERSION) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: `Index version mismatch: expected ${INDEX_VERSION}, got ${data.version}`
          }
          self.postMessage(response)
          break
        }

        try {
          catalogItems.clear()

          catalogNameIndex = new FlexSearch.Index({
            tokenize: 'forward',
            cache: 100
          })


          for (const [id, item] of data.catalogItems) {
            catalogItems.set(id, item)
          }



          const indexData = data.catalogIndex as Record<string, string>
          for (const [key, value] of Object.entries(indexData)) {
            catalogNameIndex.import(key, value)
          }

          catalogReady = true

          const response: WorkerResponse = {
            type: 'CATALOG_INDEX_IMPORTED',
            count: catalogItems.size
          }
          self.postMessage(response)
        } catch (err) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: `Failed to import index: ${err instanceof Error ? err.message : 'Unknown error'}`
          }
          self.postMessage(response)
        }
        break
      }

      case 'EXPORT_CATALOG_INDEX': {
        if (!catalogReady) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: 'Catalog index not ready for export'
          }
          self.postMessage(response)
          break
        }

        try {


          const exportedData: Record<string, string> = {}
          catalogNameIndex.export((key: string, data: string) => {
            if (data !== undefined) {
              exportedData[key] = data
            }
          })



          const exportData: ExportedIndexData = {
            version: INDEX_VERSION,
            catalogHash: message.hash,
            catalogIndex: exportedData,
            catalogItems: Array.from(catalogItems.entries())
          }

          const response: WorkerResponse = {
            type: 'CATALOG_INDEX_EXPORTED',
            data: exportData
          }
          self.postMessage(response)
        } catch (err) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: `Failed to export index: ${err instanceof Error ? err.message : 'Unknown error'}`
          }
          self.postMessage(response)
        }
        break
      }

      case 'INIT_ROLIMONS': {
        rolimonsItems.clear()
        const items = message.items


        for (const [idStr, data] of Object.entries(items)) {
          const id = parseInt(idStr, 10)
          const parsed = parseRolimonsItem(id, data as unknown[])
          rolimonsItems.set(id, parsed)
          rolimonsNameIndex.add(id, parsed.name)
          rolimonsAcronymIndex.add(id, parsed.acronym)
        }

        rolimonsReady = true
        const response: WorkerResponse = { type: 'ROLIMONS_INDEXED', count: rolimonsItems.size }
        self.postMessage(response)
        break
      }

      case 'SEARCH_CATALOG': {
        if (!catalogReady) {
          const response: WorkerResponse = {
            type: 'CATALOG_RESULTS',
            results: [],
            query: message.query
          }
          self.postMessage(response)
          break
        }

        const maxResults = message.maxResults || 50
        const searchResults = catalogNameIndex.search(message.query, maxResults)


        const results: CatalogItem[] = []
        for (const id of searchResults) {
          const item = catalogItems.get(id as number)
          if (item) {
            results.push(item)
          }
          if (results.length >= maxResults) break
        }

        const response: WorkerResponse = { type: 'CATALOG_RESULTS', results, query: message.query }
        self.postMessage(response)
        break
      }

      case 'SEARCH_ROLIMONS': {
        if (!rolimonsReady) {
          const response: WorkerResponse = {
            type: 'ROLIMONS_RESULTS',
            results: [],
            query: message.query
          }
          self.postMessage(response)
          break
        }

        const maxResults = message.maxResults || 50


        const nameResults = rolimonsNameIndex.search(message.query, maxResults)
        const acronymResults = rolimonsAcronymIndex.search(message.query, maxResults)


        const seenIds = new Set<number>()
        const results: RolimonsItem[] = []


        for (const id of nameResults) {
          if (!seenIds.has(id as number)) {
            seenIds.add(id as number)
            const item = rolimonsItems.get(id as number)
            if (item) results.push(item)
          }
          if (results.length >= maxResults) break
        }


        if (results.length < maxResults) {
          for (const id of acronymResults) {
            if (!seenIds.has(id as number)) {
              seenIds.add(id as number)
              const item = rolimonsItems.get(id as number)
              if (item) results.push(item)
            }
            if (results.length >= maxResults) break
          }
        }

        const response: WorkerResponse = { type: 'ROLIMONS_RESULTS', results, query: message.query }
        self.postMessage(response)
        break
      }

      case 'SEARCH_ALL': {
        const maxResults = message.maxResults || 50
        const halfMax = Math.ceil(maxResults / 2)

        const catalogResults: CatalogItem[] = []
        const rolimonsResults: RolimonsItem[] = []


        if (catalogReady) {
          const searchResults = catalogNameIndex.search(message.query, halfMax)
          for (const id of searchResults) {
            const item = catalogItems.get(id as number)
            if (item) catalogResults.push(item)
            if (catalogResults.length >= halfMax) break
          }
        }


        if (rolimonsReady) {
          const nameResults = rolimonsNameIndex.search(message.query, halfMax)
          const acronymResults = rolimonsAcronymIndex.search(message.query, halfMax)

          const seenIds = new Set<number>()
          for (const id of nameResults) {
            if (!seenIds.has(id as number)) {
              seenIds.add(id as number)
              const item = rolimonsItems.get(id as number)
              if (item) rolimonsResults.push(item)
            }
            if (rolimonsResults.length >= halfMax) break
          }

          if (rolimonsResults.length < halfMax) {
            for (const id of acronymResults) {
              if (!seenIds.has(id as number)) {
                seenIds.add(id as number)
                const item = rolimonsItems.get(id as number)
                if (item) rolimonsResults.push(item)
              }
              if (rolimonsResults.length >= halfMax) break
            }
          }
        }

        const response: WorkerResponse = {
          type: 'ALL_RESULTS',
          catalog: catalogResults,
          rolimons: rolimonsResults,
          query: message.query
        }
        self.postMessage(response)
        break
      }

      case 'GET_STATUS': {
        const response: WorkerResponse = {
          type: 'STATUS',
          catalogReady,
          rolimonsReady,
          catalogCount: catalogItems.size,
          rolimonsCount: rolimonsItems.size
        }
        self.postMessage(response)
        break
      }

      default: {
        const response: WorkerResponse = { type: 'ERROR', message: 'Unknown message type' }
        self.postMessage(response)
        break
      }
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
    self.postMessage(response)
  }
}


self.postMessage({
  type: 'STATUS',
  catalogReady: false,
  rolimonsReady: false,
  catalogCount: 0,
  rolimonsCount: 0
})