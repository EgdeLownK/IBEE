'use client'

import type { CSSProperties } from 'react'
import { Globe } from 'lucide-react'
import type { HomeFeedPost } from '@ibee/shared'
import { getHomeFeedDetailPreviewPath } from '@ibee/shared'

type FixedRect = {
  top: number
  left: number
  width: number
  height: number
}

type Props = {
  post: HomeFeedPost | null
  fixedRect?: FixedRect | null
}

export function HomeFeedPreviewPanel({ post, fixedRect }: Props) {
  const src = post ? getHomeFeedDetailPreviewPath(post) : null

  const fixedStyle: CSSProperties | undefined = fixedRect
    ? {
        position: 'fixed',
        top: fixedRect.top,
        left: fixedRect.left,
        width: fixedRect.width,
        height: fixedRect.height,
        zIndex: 5,
      }
    : undefined

  return (
    <aside
      className={`home-feed-preview${fixedRect ? ' home-feed-preview--fixed' : ''}`}
      style={fixedStyle}
      aria-label="Aperçu du contenu"
    >
      <div className="home-feed-preview__surface">
        {!src ? (
          <div className="home-feed-preview__empty">
            <Globe className="home-feed-preview__empty-icon" aria-hidden="true" />
            <p>Sélectionne un contenu pour voir le détail et le profil de son auteur.</p>
          </div>
        ) : (
          <iframe
            key={src}
            src={src}
            title={`${post!.title} — ${post!.entity.displayName}`}
            className="home-feed-preview__frame"
          />
        )}
      </div>
    </aside>
  )
}
