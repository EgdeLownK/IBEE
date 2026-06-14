'use client'

import { BarChart3, Heart, MessageCircle, Share2 } from 'lucide-react'
import Link from 'next/link'
import { PublicationMediaCarousel } from '@ibee/ui-react'
import { trackAnalyticsEvents } from '@/lib/analytics-client'

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

  async function handleShare() {
    trackAnalyticsEvents([
      {
        entity_id: entityId,
        event_type: 'publication_share',
        resource_id: publicationId,
      },
    ])

    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl })
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      window.alert('Lien copié dans le presse-papiers.')
    } catch {
      window.alert('Copiez le lien de cette publication depuis votre navigateur.')
    }
  }

  return (
    <div className="pub-detail">
      {sortedMedia.length > 0 && (
        <div className="pub-detail__media">
          <PublicationMediaCarousel media={carouselMedia} />
        </div>
      )}

      {content && (
        <div className="pub-detail__body">
          <p className="pub-detail__text">{content}</p>
        </div>
      )}

      <div className="pub-detail__engage">
        <div className="pub-detail__engage-left">
          <button
            type="button"
            aria-label="Liker cette publication"
            className="pub-detail__engage-btn"
            title="Cette fonctionnalité arrive bientôt"
            onClick={() => window.alert('Cette fonctionnalité arrive bientôt')}
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            <span>0</span>
          </button>
          <Link href="#comments" aria-label="Commenter cette publication" className="pub-detail__engage-btn">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{commentsCount}</span>
          </Link>
          <span className="pub-detail__engage-stat">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span>0</span>
          </span>
        </div>
        <button
          type="button"
          aria-label="Partager cette publication"
          className="pub-detail__engage-btn"
          onClick={() => void handleShare()}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
