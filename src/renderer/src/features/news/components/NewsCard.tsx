import React from 'react'
import { BadgeCheck } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/UI/display/Avatar'
import { Card } from '../../../components/UI/display/Card'
import { cn } from '../../../lib/utils'
import { NewsPost } from '../types'

interface NewsCardProps {
  post: NewsPost
}

const formatContent = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = content.split(urlRegex).filter((part) => part.length > 0)

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export const NewsCard: React.FC<NewsCardProps> = ({ post }) => {
  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)] p-5" disableHover>
      <div className="flex gap-4">
        <div className="flex flex-col items-center shrink-0">
          <Avatar className="h-12 w-12 border-2 border-[var(--color-border)] shadow-sm">
            <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
            <AvatarFallback>{post.author.name[0]}</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1.5">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[var(--color-text-primary)] text-[15px] hover:underline cursor-pointer">
                  {post.author.name}
                </span>
                {post.author.verified && (
                  <BadgeCheck className="w-4 h-4 text-[var(--accent-color)] flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span>@{post.author.handle}</span>
                <span>·</span>
                <span>{post.timestamp}</span>
              </div>
            </div>
          </div>

          {post.content && (
            <div className="text-[var(--color-text-secondary)] whitespace-pre-wrap mb-4 text-[15px] leading-relaxed font-normal">
              {formatContent(post.content)}
            </div>
          )}

          {post.media && post.media.length > 0 && (
            <div
              className={cn(
                'grid gap-0.5 mb-4 rounded-xl overflow-hidden border border-[var(--color-border-subtle)]',
                post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
                post.media.length >= 3 && 'grid-rows-2'
              )}
            >
              {post.media.map((media, index) => {
                const isSingle = post.media!.length === 1
                const isThree = post.media!.length === 3

                return (
                  <div
                    key={index}
                    className={cn(
                      'relative bg-[var(--color-surface-strong)] overflow-hidden cursor-pointer',
                      isSingle ? 'w-full h-full' : 'aspect-square',
                      isThree && index === 0 ? 'row-span-2 aspect-auto h-full' : ''
                    )}
                  >
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={media.alt || 'Post media'}
                        className={cn(
                          'w-full h-full',
                          isSingle ? 'object-contain max-h-[500px] bg-black/50' : 'object-cover'
                        )}
                      />
                    ) : (
                      <video
                        src={media.url}
                        poster={media.alt}
                        controls
                        className="w-full h-full object-cover"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
