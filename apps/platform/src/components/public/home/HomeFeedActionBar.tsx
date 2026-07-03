'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BarChart3, Heart, Share2 } from 'lucide-react'
import type { HomeFeedPost } from '@ibee/shared'
import { trackAnalyticsEvents } from '@/lib/analytics-client'

type Props = {
  post: HomeFeedPost
}

function resolveShareUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return href
  const origin =
    typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_WEB_URL ?? '')
  return `${origin}${href.startsWith('/') ? href : `/${href}`}`
}

export function HomeFeedActionBar({ post }: Props) {
  const [favorited, setFavorited] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleFavorite() {
    if (pending) return
    setPending(true)
    try {
      if (post.kind === 'product') {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: post.id,
            priceCents: post.priceCents ?? 0,
          }),
        })
        if (res.status === 401) {
          window.alert('Connecte-toi pour ajouter aux favoris.')
          return
        }
        if (!res.ok) throw new Error('wishlist')
        const data = (await res.json()) as { in_wishlist: boolean }
        setFavorited(data.in_wishlist)
        return
      }

      const endpoint = favorited ? '/api/unfollow' : '/api/follow'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: post.entity.id, slug: post.entity.slug }),
      })
      if (res.status === 401) {
        window.alert('Connecte-toi pour suivre ce profil.')
        return
      }
      if (!res.ok) throw new Error('follow')
      setFavorited(!favorited)
    } catch {
      window.alert('Action impossible pour le moment.')
    } finally {
      setPending(false)
    }
  }

  async function handleShare() {
    const url = resolveShareUrl(post.href)

    trackAnalyticsEvents([
      {
        entity_id: post.entity.id,
        event_type: 'publication_share',
        resource_id: post.id,
        metadata: { feed_kind: post.kind },
      },
    ])

    try {
      if (navigator.share) {
        await navigator.share({ url, title: post.title })
        return
      }
      await navigator.clipboard.writeText(url)
      window.alert('Lien copié.')
    } catch {
      /* dismiss */
    }
  }

  return (
    <div className="home-feed-card__actions" onClick={(e) => e.stopPropagation()}>
      <Link href={post.href} className="home-feed-card__cta">
        {post.ctaLabel}
      </Link>

      <div className="home-feed-card__actions-right">
        <button
          type="button"
          className={`home-feed-card__icon-btn${favorited ? ' is-active' : ''}`}
          aria-label="Ajouter aux favoris"
          disabled={pending}
          onClick={() => void handleFavorite()}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="home-feed-card__stat" aria-label={`${post.viewCount} vues`}>
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          <span>{post.viewCount}</span>
        </span>
        <button
          type="button"
          className="home-feed-card__icon-btn"
          aria-label="Partager"
          onClick={() => void handleShare()}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
