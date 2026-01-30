import React from 'react'






export const linkify = (text: string): React.ReactNode[] => {

  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {

    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }


    const url = match[0]
    const href = url.startsWith('www.') ? `https:
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent-color)] hover:underline break-all"
      >
        {url}
      </a>
    )

    lastIndex = urlRegex.lastIndex
  }


  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}