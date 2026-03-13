import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { AssetOwner, ResellerItem } from '@shared/ipc-schemas/avatar'
import { HorizontalCarousel } from '@renderer/components/UI/navigation/HorizontalCarousel'
import { PaginatedList } from '@renderer/components/UI/navigation/PaginatedList'
import { UserCard } from '@renderer/components/UI/display/UserCard'

// ============================================================================
// Owners List
// ============================================================================

interface OwnersListProps {
  owners: AssetOwner[]
  ownersLoading: boolean
  ownerAvatars: Map<number, string>
  ownerNames: Map<number, string>
  onLoadMore: () => void
  onOwnerClick?: (userId: string | number, displayName?: string, avatarUrl?: string) => void
}

export const OwnersList: React.FC<OwnersListProps> = ({
  owners,
  ownersLoading,
  ownerAvatars,
  ownerNames,
  onLoadMore,
  onOwnerClick
}) => {
  if (ownersLoading) {
    return (
      <div className="px-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-neutral-500" />
        </div>
      </div>
    )
  }

  if (owners.length === 0) {
    return (
      <div className="px-4">
        <div className="text-center py-6 text-neutral-500 text-sm">No owners found</div>
      </div>
    )
  }

  return (
    <div className="px-4">
      <HorizontalCarousel onNearEnd={onLoadMore}>
        {owners.map((owner) => {
          const ownerId = owner.owner?.id
          const ownerName =
            owner.owner?.name ||
            (ownerId ? ownerNames.get(ownerId) : undefined) ||
            `User ${ownerId}`
          const avatarUrl = ownerId ? ownerAvatars.get(ownerId) : undefined

          return (
            <UserCard
              key={owner.id}
              variant="owner"
              name={ownerName}
              avatarUrl={avatarUrl}
              userId={ownerId}
              serialNumber={owner.serialNumber}
              ownedSince={owner.created}
              onClick={
                onOwnerClick && ownerId
                  ? () => onOwnerClick(ownerId, ownerNames.get(ownerId), ownerAvatars.get(ownerId))
                  : undefined
              }
            />
          )
        })}
      </HorizontalCarousel>
    </div>
  )
}

// ============================================================================
// Resellers List
// ============================================================================

interface ResellersListProps {
  resellers: ResellerItem[]
  resellersLoading: boolean
  resellerAvatars: Map<number, string>
  purchasingReseller: string | null
  onBuy: (reseller: ResellerItem) => void
  onLoadMore: () => void
}

export const ResellersList: React.FC<ResellersListProps> = ({
  resellers,
  resellersLoading,
  resellerAvatars,
  purchasingReseller,
  onBuy,
  onLoadMore
}) => {
  if (resellersLoading) {
    return (
      <div className="pt-6 border-t border-neutral-800">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-neutral-500" />
        </div>
      </div>
    )
  }

  if (resellers.length === 0) {
    return (
      <div className="pt-6 border-t border-neutral-800">
        <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-4">Resellers</h3>
        <div className="text-center py-6 text-neutral-500 text-sm">No resellers available</div>
      </div>
    )
  }

  return (
    <div className="pt-6 border-t border-neutral-800">
      <HorizontalCarousel title="Resellers" onNearEnd={onLoadMore}>
        {resellers.map((reseller) => (
          <UserCard
            key={reseller.collectibleProductId}
            variant="reseller"
            name={reseller.seller.name}
            avatarUrl={resellerAvatars.get(reseller.seller.sellerId)}
            userId={reseller.seller.sellerId}
            serialNumber={reseller.serialNumber}
            price={reseller.price}
            hasVerifiedBadge={reseller.seller.hasVerifiedBadge}
            isPurchasing={purchasingReseller === reseller.collectibleProductId}
            onBuy={() => onBuy(reseller)}
          />
        ))}
      </HorizontalCarousel>
    </div>
  )
}

// ============================================================================
// Hoarders List
// ============================================================================

interface Hoarder {
  id?: string
  name: string
  quantity: number
}

interface HoardersListProps {
  hoardsData: {
    num_hoards?: number | null
    owner_ids?: string[] | null
    owner_names?: string[] | null
    quantities?: number[] | null
  } | null
  onOwnerClick?: (userId: string | number, displayName?: string, avatarUrl?: string) => void
}

export const HoardersList: React.FC<HoardersListProps> = ({ hoardsData, onOwnerClick }) => {
  if (!hoardsData || !hoardsData.owner_names || hoardsData.owner_names.length === 0) {
    return null
  }

  const { owner_ids, owner_names, quantities } = hoardsData

  // Create combined and sorted list
  const hoarders: Hoarder[] = owner_names
    .map((name, index) => ({
      id: owner_ids?.[index],
      name,
      quantity: quantities?.[index] || 0
    }))
    .sort((a, b) => b.quantity - a.quantity)

  if (hoarders.length === 0) return null

  const renderHoarderItem = (hoarder: Hoarder, _index: number, globalIndex: number) => (
    <div
      className={cn(
        'flex items-center justify-between p-2.5 rounded-lg transition-colors',
        'bg-neutral-800/30 hover:bg-neutral-800/50',
        onOwnerClick && hoarder.id ? 'cursor-pointer' : ''
      )}
      onClick={
        onOwnerClick && hoarder.id ? () => onOwnerClick(hoarder.id!, hoarder.name) : undefined
      }
    >
      <div className="flex items-center gap-3">
        <span className="text-neutral-500 text-xs font-medium pl-3">#{globalIndex + 1}</span>
        {onOwnerClick && hoarder.id ? (
          <span className="text-sm text-white hover:text-emerald-400 transition-colors">
            {hoarder.name}
          </span>
        ) : (
          <a
            href={`https://www.roblox.com/users/${hoarder.id}/profile`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:text-emerald-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {hoarder.name}
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-semibold">{hoarder.quantity}</span>
        <span className="text-neutral-500 text-xs">copies</span>
      </div>
    </div>
  )

  return (
    <PaginatedList
      items={hoarders}
      itemsPerPage={5}
      renderItem={renderHoarderItem}
      keyExtractor={(hoarder, index) => hoarder.id || index}
    />
  )
}
