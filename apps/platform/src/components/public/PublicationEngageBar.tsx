'use client'

import { BarChart3, Heart, MessageCircle, Share2 } from 'lucide-react'
import Link from 'next/link'
import { trackAnalyticsEvents } from '@/lib/analytics-client'

type Props = {
  entityId: string
  publicationId: string
  commentsCount?: number
  shareUrl: string
  commentsHref?: string | null
  className?: string
}

function resolveShareUrl(shareUrl: string): string {
  if (/^https?:\/\//i.test(shareUrl)) return shareUrl
  const origin =
    typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_WEB_URL ?? '')
  return `${origin}${shareUrl.startsWith('/') ? shareUrl : `/${shareUrl}`}`
}

export function PublicationEngageBar({
  entityId,
  publicationId,
  commentsCount = 0,
  shareUrl,
  commentsHref = '#comments',
  className,
}: Props) {
  async function handleShare() {
    trackAnalyticsEvents([
      {
        entity_id: entityId,
        event_type: 'publication_share',
        resource_id: publicationId,
      },
    ])

    const url = resolveShareUrl(shareUrl)

    try {
      if (navigator.share) {
        await navigator.share({ url })
        return
      }
      await navigator.clipboard.writeText(url)
      window.alert('Lien copié dans le presse-papiers.')
    } catch {
      window.alert('Copiez le lien de cette publication depuis votre navigateur.')
    }
  }

  return (
    <div
      className={`pub-detail__engage${className ? ` ${className}` : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
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
        {commentsHref ? (
          <Link
            href={commentsHref}
            aria-label="Commenter cette publication"
            className="pub-detail__engage-btn"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{commentsCount}</span>
          </Link>
        ) : (
          <span className="pub-detail__engage-btn" aria-label="Commenter cette publication">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{commentsCount}</span>
          </span>
        )}
        <span className="pub-detail__engage-stat">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          <span>0</span>
        </span>
      </div>
      <button
        type="button"
        aria-label="Partager cette publication"
        className="pub-detail__engage-btn"
        disabled={!shareUrl}
        onClick={() => void handleShare()}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
