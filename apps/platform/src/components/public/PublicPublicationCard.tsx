'use client'

import Link from 'next/link'
import { PublicationMediaCarousel } from '@ibee/ui-react'
import type { PublicProfileData } from '@/lib/load-public-profile'

type Publication = PublicProfileData['publications'][number]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function PublicPublicationCard({
  publication,
  entitySlug,
  entityDisplayName,
  entityAvatarUrl,
}: {
  publication: Publication
  entitySlug: string
  entityDisplayName: string
  entityAvatarUrl: string | null
}) {
  const href = publication.slug ? `/${entitySlug}/news/${publication.slug}` : null
  const media = (publication.publication_media ?? []).map(
    (m: { id?: string; url: string; type?: string | null; position?: number; width?: number | null; height?: number | null }, i: number) => ({
    id: m.id ?? String(i),
    url: m.url,
    type: (m.type === 'video' ? 'video' : 'image') as 'image' | 'video',
    position: m.position ?? i,
    width: m.width ?? null,
    height: m.height ?? null,
  }))

  const body = (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
          {entityAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entityAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-accent">
              {entityDisplayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-neutral-900">{entityDisplayName}</p>
          <p className="m-0 text-xs text-neutral-400">
            {formatDate(publication.published_at ?? publication.created_at)}
          </p>
        </div>
      </div>
      {publication.content && (
        <p className="m-0 whitespace-pre-wrap px-4 pb-3 text-sm leading-relaxed text-neutral-700">
          {publication.content}
        </p>
      )}
      {media.length > 0 && <PublicationMediaCarousel media={media} />}
    </>
  )

  if (href) {
    return (
      <article className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <Link href={href} className="block text-inherit no-underline hover:bg-panel/40">
          {body}
        </Link>
      </article>
    )
  }

  return (
    <article className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface">{body}</article>
  )
}
