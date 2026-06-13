'use client'

import Link from 'next/link'
import { formatRelativeDateFr } from '@/lib/format-date-fr'

interface Props {
  id: string
  content: string
  createdAt: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  authorSlug: string
  canDelete?: boolean
  entitySlug: string
  publicationSlug: string
  onDelete?: (commentId: string) => void
}

export function CommentCard({
  id,
  content,
  createdAt,
  authorDisplayName,
  authorAvatarUrl,
  authorSlug,
  canDelete = false,
  onDelete,
}: Props) {
  const timeAgo = formatRelativeDateFr(createdAt)
  const initial = authorDisplayName.charAt(0).toUpperCase()

  return (
    <article className="flex gap-3 py-4" id={`comment-${id}`}>
      <Link
        href={`/${authorSlug}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft"
      >
        {authorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={authorAvatarUrl} alt={authorDisplayName} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xs font-semibold text-accent">{initial}</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/${authorSlug}`}
            className="text-sm font-medium text-neutral-900 transition-colors hover:text-accent"
          >
            {authorDisplayName}
          </Link>
          <time dateTime={createdAt} className="text-xs text-neutral-400">
            {timeAgo}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-600">{content}</p>
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="mt-1 text-xs text-neutral-400 transition-colors hover:text-error"
            aria-label="Supprimer ce commentaire"
          >
            Supprimer
          </button>
        )}
      </div>
    </article>
  )
}
