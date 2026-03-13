import { CommandFactory } from './types'
import { CatalogResultItem } from '../stores/useCommandPaletteStore'

export const createCatalogCommands: CommandFactory = (callbacks) => [
  {
    id: 'view-item-name',
    label: 'View Item by Name',
    description: 'Search Roblox-created catalog items by name',
    icon: 'boxes',
    category: 'catalog',
    keywords: [
      'catalog',
      'item',
      'search',
      'asset',
      'hat',
      'gear',
      'accessory',
      'clothing',
      'roblox'
    ],
    requiresInput: true,
    showsResults: true,
    inputPlaceholder: 'Enter item name...',
    inputLabel: 'Item Name',
    onSearch: async (name: string): Promise<CatalogResultItem[]> => {
      try {
        // Search catalog filtered by Roblox creator
        const response = await window.api.searchCatalog(name, 30, 'Roblox')
        const items = response.data || []

        if (items.length === 0) {
          return []
        }

        // Get thumbnails for all items
        const assetIds = items.map((item) => item.id)
        try {
          const thumbnailResponse = await window.api.getBatchThumbnails(assetIds, 'Asset')
          const thumbnailMap = new Map<number, string>()

          if (thumbnailResponse.data) {
            thumbnailResponse.data.forEach((thumb) => {
              if (thumb.imageUrl) {
                thumbnailMap.set(thumb.targetId, thumb.imageUrl)
              }
            })
          }

          // Attach thumbnails to items
          return items.map((item) => ({
            ...item,
            imageUrl: thumbnailMap.get(item.id) || undefined
          }))
        } catch (thumbError) {
          console.warn('Failed to load thumbnails:', thumbError)
          // Return items without thumbnails
          return items
        }
      } catch (e) {
        console.error('Catalog search failed:', e)
        callbacks.showNotification('Failed to search catalog', 'error')
        return []
      }
    },
    onResultSelect: (item: CatalogResultItem) => {
      // Open accessory details modal
      callbacks.onViewAccessory(item)
    }
  },
  {
    id: 'view-item-id',
    label: 'View Item by ID',
    description: 'View a Roblox catalog item by its ID',
    icon: 'hash',
    category: 'catalog',
    keywords: ['catalog', 'item', 'id', 'asset', 'view'],
    requiresInput: true,
    inputPlaceholder: 'Enter item ID...',
    inputLabel: 'Item ID',
    onInputSubmit: async (idStr: string) => {
      const id = parseInt(idStr, 10)
      if (isNaN(id)) {
        callbacks.showNotification('Please enter a valid item ID', 'error')
        return
      }

      // Open accessory details modal with just the ID
      callbacks.onViewAccessory({ id, itemType: 'Asset', name: `Item #${id}` })
    }
  }
]
