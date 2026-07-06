'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PublicationMediaCarousel } from '@ibee/ui-react'
import type { PublicProfileData } from '@/lib/load-public-profile'
import { PublicationEngageBar } from './PublicationEngageBar'
import { PublicationCardText } from './PublicationCardText'

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
  const router = useRouter()
  const href = publication.slug ? `/${entitySlug}/news/${publication.slug}` : null
  const media = (publication.publication_media ?? []).map(
    (
      m: {
        id?: string
        url: string
        type?: string | null
        position?: number
        width?: number | null
        height?: number | null
      },
      i: number
    ) => ({
      id: m.id ?? String(i),
      url: m.url,
      type: (m.type === 'video' ? 'video' : 'image') as 'image' | 'video',
      position: m.position ?? i,
      width: m.width ?? null,
      height: m.height ?? null,
    })
  )

  const initial = entityDisplayName.charAt(0).toUpperCase()
  const dateSource = publication.published_at ?? publication.created_at

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    if (!href) return
    const target = e.target as HTMLElement
    if (target.closest('a, button, textarea, input, [role="menu"]')) return
    router.push(href)
  }

  return (
    <article
      className={`pub-card pub-card--feed${href ? ' pub-card--clickable' : ''}`}
      onClick={href ? handleCardClick : undefined}
    >
      <div className="pub-card__head">
        <div className="pub-card__avatar">
          {entityAvatarUrl ? (
            <Image src={entityAvatarUrl} alt="" width={40} height={40} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="pub-card__meta-block min-w-0 flex-1">
          <h3 className="pub-card__title m-0 truncate">
            {href ? (
              <Link href={href}>{publication.title || entityDisplayName}</Link>
            ) : (
              <span>{publication.title || entityDisplayName}</span>
            )}
          </h3>
          <time className="pub-card__meta">{formatDate(dateSource)}</time>
        </div>
      </div>

      {media.length > 0 && (
        <div className="pub-card__carousel">
          <PublicationMediaCarousel fullWidth media={media} />
        </div>
      )}

      {publication.content && <PublicationCardText content={publication.content} />}

      {href && (
        <PublicationEngageBar
          entityId={publication.entity_id}
          publicationId={publication.id}
          commentsCount={publication.comments_count ?? 0}
          shareUrl={href}
          commentsHref={`${href}#comments`}
          className="pub-detail__engage--feed"
        />
      )}
    </article>
  )
}
