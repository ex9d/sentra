import React, { useMemo, useCallback } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { useMentionProfiles } from '../hooks/useMentionProfiles'
import { linkify } from '@renderer/utils/linkify'

interface DescriptionWithMentionsProps {
  description: string
  mentionSourceText: string
  onSelectProfile?: (userId: number) => void
}

export const DescriptionWithMentions: React.FC<DescriptionWithMentionsProps> = ({
  description,
  mentionSourceText,
  onSelectProfile
}) => {
  const { mentionProfiles, ensureMentionProfile } = useMentionProfiles(mentionSourceText)

  const handleMentionClick = useCallback(
    async (username: string) => {
      if (!onSelectProfile) return
      const profileData = await ensureMentionProfile(username)
      if (profileData?.id) {
        onSelectProfile(profileData.id)
      }
    },
    [ensureMentionProfile, onSelectProfile]
  )

  const descriptionContent = useMemo(() => {
    if (!mentionSourceText) {
      // If no mentions, just linkify URLs
      return linkify(description)
    }

    const regex = /@([A-Za-z0-9_]+)/g
    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let partIndex = 0

    while ((match = regex.exec(description)) !== null) {
      if (match.index > lastIndex) {
        // Linkify the text segment before the mention
        const textSegment = description.slice(lastIndex, match.index)
        const linkifiedSegment = linkify(textSegment)
        nodes.push(
          <React.Fragment key={`desc-text-${partIndex++}`}>{linkifiedSegment}</React.Fragment>
        )
      }

      const username = match[1]
      const mentionKey = username.toLowerCase()
      const mentionData = mentionProfiles[mentionKey]
      const canNavigate = Boolean(onSelectProfile)

      const mentionTooltip = mentionData?.displayName
        ? `${mentionData.displayName} (@${mentionData.name})`
        : `@${username}`
      nodes.push(
        <Tooltip key={`desc-mention-${partIndex++}-${match.index}`}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                if (canNavigate) {
                  handleMentionClick(username)
                }
              }}
              className={`pressable inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold text-white align-middle transition ${canNavigate ? 'cursor-pointer border-[var(--accent-color-border)] bg-[rgba(var(--accent-color-rgb),0.12)] hover:bg-[rgba(var(--accent-color-rgb),0.18)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent-color)]' : 'cursor-default border-[rgba(var(--accent-color-rgb),0.15)] bg-[rgba(var(--accent-color-rgb),0.08)] opacity-70'}`}
              aria-disabled={!canNavigate}
              style={{ marginLeft: '0.2rem', marginRight: '0.2rem' }}
            >
              <span className="relative w-4 h-4 rounded-full overflow-hidden border border-[rgba(var(--accent-color-rgb),0.2)] bg-neutral-700">
                {mentionData?.avatarUrl ? (
                  <img
                    src={mentionData.avatarUrl}
                    alt={mentionData.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full inline-block bg-neutral-800 animate-pulse" />
                )}
              </span>
              <span>@{mentionData?.name ?? username}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{mentionTooltip}</TooltipContent>
        </Tooltip>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < description.length) {
      // Linkify the remaining text after the last mention
      const textSegment = description.slice(lastIndex)
      const linkifiedSegment = linkify(textSegment)
      nodes.push(
        <React.Fragment key={`desc-text-${partIndex++}`}>{linkifiedSegment}</React.Fragment>
      )
    }

    return nodes.length ? nodes : description
  }, [description, mentionProfiles, mentionSourceText, onSelectProfile, handleMentionClick])

  return <>{descriptionContent}</>
}
