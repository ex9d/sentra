import { AssetDetails } from '@shared/ipc-schemas/avatar'




export function normalizeAssetDetails(detailsData: any): AssetDetails {
  return {
    ...detailsData,
    name: detailsData.name || detailsData.Name,
    description: detailsData.description || detailsData.Description,

    price:
      detailsData.price !== undefined
        ? detailsData.price
        : detailsData.PriceInRobux !== undefined
          ? detailsData.PriceInRobux
          : null,

    creatorName: detailsData.creatorName || detailsData.Creator?.Name,
    creatorType: detailsData.creatorType || detailsData.Creator?.CreatorType,
    creatorHasVerifiedBadge:
      detailsData.creatorHasVerifiedBadge || detailsData.Creator?.HasVerifiedBadge,
    created: detailsData.itemCreatedUtc || detailsData.created || detailsData.Created,
    updated: detailsData.itemUpdatedUtc || detailsData.updated || detailsData.Updated,
    isLimited:
      detailsData.isLimited ||
      detailsData.IsLimited ||
      detailsData.CollectiblesItemDetails?.IsLimited,
    isLimitedUnique: detailsData.isLimitedUnique || detailsData.IsLimitedUnique,
    isPBR: detailsData.isPBR,
    itemType: detailsData.itemType || detailsData.ProductType || 'Asset',

    isPurchasable: detailsData.isPurchasable,
    hasResellers: detailsData.hasResellers,
    lowestPrice: detailsData.lowestPrice,
    sales: detailsData.Sales,
    remaining:
      detailsData.Remaining !== undefined
        ? detailsData.Remaining
        : detailsData.unitsAvailableForConsumption,

    totalQuantity: detailsData.totalQuantity || detailsData.CollectiblesItemDetails?.TotalQuantity,

    collectibleLowestResalePrice:
      detailsData.collectibleLowestResalePrice ||
      detailsData.CollectiblesItemDetails?.CollectibleLowestResalePrice
  }
}