'use client'

import { PublicationMediaCarousel } from '@ibee/ui-react'
import { PublicationEngageBar } from './PublicationEngageBar'

type Media = {
  id: string
  url: string
  alt_text?: string | null
  position: number
  width?: number | null
  height?: number | null
  type?: string | null
}

interface Props {
  content: string | null
  media: Media[]
  commentsCount: number
  entityId: string
  publicationId: string
  shareUrl: string
}

export function PublicationDetail({
  content,
  media,
  commentsCount,
  entityId,
  publicationId,
  shareUrl,
}: Props) {
  const sortedMedia = [...media].sort((a, b) => a.position - b.position)
  const carouselMedia = sortedMedia.map((m) => ({
    url: m.url,
    type: m.type,
    alt_text: m.alt_text,
    width: m.width,
    height: m.height,
  }))

  return (
    <div className="pub-detail">
      {sortedMedia.length > 0 && (
        <div className="pub-detail__media">
          <PublicationMediaCarousel fullWidth media={carouselMedia} />
        </div>
      )}

      {content && (
        <div className="pub-detail__body">
          <p className="pub-detail__text">{content}</p>
        </div>
      )}

      <PublicationEngageBar
        entityId={entityId}
        publicationId={publicationId}
        commentsCount={commentsCount}
        shareUrl={shareUrl}
        commentsHref="#comments"
      />
    </div>
  )
}
