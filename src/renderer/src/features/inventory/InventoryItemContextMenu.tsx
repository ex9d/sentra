import React, { useMemo } from 'react'
import { Box, Image as ImageIcon, Copy, FileDown } from 'lucide-react'
import { ASSET_TYPES_WITH_MODELS } from '../avatar/utils/categoryUtils'
import GenericContextMenu, {
  ContextMenuSection,
  ContextMenuItem
} from '@renderer/components/UI/menus/GenericContextMenu'

interface InventoryItemContextMenuProps {
  activeMenu: {
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: number | string
  } | null
  onClose: () => void
  onDownloadObj: (assetId: number, assetName: string) => void
  onDownloadTexture: (assetId: number, assetName: string) => void
  onDownloadTemplate: (assetId: number, assetName: string) => void
  onCopyAssetId: (assetId: number) => void
}

const InventoryItemContextMenu: React.FC<InventoryItemContextMenuProps> = ({
  activeMenu,
  onClose,
  onDownloadObj,
  onDownloadTexture,
  onDownloadTemplate,
  onCopyAssetId
}) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    // Convert assetType to number if it's a string
    // Map string asset type names to numeric IDs
    const assetTypeNum =
      typeof activeMenu.assetType === 'string'
        ? (() => {
            // Map common string asset types to their numeric IDs
            const typeMap: Record<string, number> = {
              Hat: 8,
              HairAccessory: 41,
              FaceAccessory: 42,
              NeckAccessory: 43,
              ShoulderAccessory: 44,
              FrontAccessory: 45,
              BackAccessory: 46,
              WaistAccessory: 47,
              Gear: 19,
              Shirt: 11,
              Pants: 12,
              TShirt: 2,
              Head: 17,
              Face: 18,
              EmoteAnimation: 61
            }
            return typeMap[activeMenu.assetType as string] || undefined
          })()
        : activeMenu.assetType

    // Classic Shirt (11) and Pants (12) - only these support templates
    const isClothing = assetTypeNum === 11 || assetTypeNum === 12
    // Check if asset type has model (for OBJ download)
    const hasModel = assetTypeNum && ASSET_TYPES_WITH_MODELS.includes(assetTypeNum)

    const downloadItems: ContextMenuItem[] = []
    if (hasModel) {
      downloadItems.push({
        label: 'Download .obj',
        icon: <Box size={16} />,
        onClick: () => onDownloadObj(activeMenu.assetId, activeMenu.assetName)
      })
    }
    downloadItems.push({
      label: 'Download Texture',
      icon: <ImageIcon size={16} />,
      onClick: () => onDownloadTexture(activeMenu.assetId, activeMenu.assetName)
    })
    if (isClothing) {
      downloadItems.push({
        label: 'Download Template',
        icon: <FileDown size={16} />,
        onClick: () => onDownloadTemplate(activeMenu.assetId, activeMenu.assetName)
      })
    }

    return [
      { items: downloadItems },
      {
        items: [
          {
            label: 'Copy Asset ID',
            icon: <Copy size={16} />,
            onClick: () => onCopyAssetId(activeMenu.assetId)
          }
        ]
      }
    ]
  }, [activeMenu, onDownloadObj, onDownloadTexture, onDownloadTemplate, onCopyAssetId])

  return (
    <GenericContextMenu
      position={activeMenu ? { x: activeMenu.x, y: activeMenu.y } : null}
      sections={sections}
      onClose={onClose}
    />
  )
}

export default InventoryItemContextMenu
