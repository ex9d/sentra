import React, { useState, useEffect } from 'react'
import { Account, AccountStatus } from '@renderer/types'
import UserProfileView from '@renderer/features/profile/UserProfileView'
import { Sheet, SheetContent, SheetHandle, SheetBody } from '@renderer/components/UI/dialogs/Sheet'

interface UniversalProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | number | null
  selectedAccount: Account | null
  privacyMode?: boolean
  initialData?: Partial<ExtendedProfile> | null
  onJoinGame?: (placeId: number | string, jobId?: string, userId?: number | string) => void
}

export interface ExtendedProfile {
  id: number
  name: string
  displayName: string
  description: string
  created: string
  isBanned: boolean
  externalAppDisplayName: string | null


  followerCount: number
  followingCount: number
  friendCount: number


  isPremium: boolean
  isAdmin: boolean
  avatarImageUrl: string | null
  headshotUrl: string | null


  status?: AccountStatus
  lastLocation?: string
}

const UniversalProfileModal: React.FC<UniversalProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  selectedAccount,
  privacyMode,
  initialData,
  onJoinGame
}) => {
  const [activeUserId, setActiveUserId] = useState<string | number | null>(userId)

  useEffect(() => {
    if (isOpen) {
      setActiveUserId(userId)
    }
  }, [isOpen, userId])

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetContent className="h-full">
        <SheetHandle />
        <SheetBody>
          {activeUserId && selectedAccount?.cookie ? (
            <div key={activeUserId?.toString()} className="h-full w-full animate-profile-swap">
              <UserProfileView
                userId={activeUserId}
                requestCookie={selectedAccount.cookie}
                accountUserId={selectedAccount.userId}
                isOwnAccount={String(activeUserId) === selectedAccount.userId}
                privacyMode={!!privacyMode}
                onClose={onClose}
                showCloseButton={false}
                onSelectProfile={(id) => setActiveUserId(id)}
                onJoinGame={onJoinGame}
                initialData={
                  activeUserId === userId && initialData
                    ? {
                        displayName: initialData.displayName,
                        username: initialData.name,
                        avatarUrl: initialData.headshotUrl || undefined,
                        status: initialData.status,
                        notes: initialData.description,
                        joinDate: initialData.created,
                        friendCount: initialData.friendCount,
                        followerCount: initialData.followerCount,
                        followingCount: initialData.followingCount,
                        isPremium: initialData.isPremium,
                        isAdmin: initialData.isAdmin
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              {selectedAccount?.cookie
                ? 'No User Selected'
                : 'Please select an account to view profiles'}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

export default UniversalProfileModal