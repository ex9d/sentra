import React, { useMemo } from 'react'
import { Box, Image as ImageIcon, FileDown } from 'lucide-react'
import { ASSET_TYPES_WITH_MODELS } from '../utils/categoryUtils'
import GenericContextMenu, {
  ContextMenuSection,
  ContextMenuItem
} from '@renderer/components/UI/menus/GenericContextMenu'

interface AssetImageContextMenuProps {
  activeMenu: {
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: number
  } | null
  onClose: () => void
  onDownloadObj: (assetId: number, assetName: string) => void
  onDownloadTexture: (assetId: number, assetName: string) => void
  onDownloadTemplate: (assetId: number, assetName: string) => void
}

const AssetImageContextMenu: React.FC<AssetImageContextMenuProps> = ({
  activeMenu,
  onClose,
  onDownloadObj,
  onDownloadTexture,
  onDownloadTemplate
}) => {
  const sections: ContextMenuSection[] = useMemo(() => {
    if (!activeMenu) return []

    // Classic Shirt (11) and Pants (12)
    const isClothing = activeMenu.assetType === 11 || activeMenu.assetType === 12
    // Check if asset type has model
    const hasModel = activeMenu.assetType && ASSET_TYPES_WITH_MODELS.includes(activeMenu.assetType)

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

    return [{ items: downloadItems }]
  }, [activeMenu, onDownloadObj, onDownloadTexture, onDownloadTemplate])

  return (
    <GenericContextMenu
      position={activeMenu ? { x: activeMenu.x, y: activeMenu.y } : null}
      sections={sections}
      onClose={onClose}
    />
  )
}

export default AssetImageContextMenu
