'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { HomeFeedPost } from '@ibee/shared'
import { HomeFeedActionBar } from './HomeFeedActionBar'

const KIND_LABELS: Record<HomeFeedPost['kind'], string> = {
  product: 'Produit',
  event: 'Événement',
  service: 'Service',
}

type Props = {
  post: HomeFeedPost
  isDesktop?: boolean
  isSelected?: boolean
  onSelect?: (post: HomeFeedPost) => void
}

export function HomeFeedCard({ post, isDesktop = false, isSelected = false, onSelect }: Props) {
  const router = useRouter()
  const initial = post.entity.displayName.trim().charAt(0).toUpperCase() || '?'

  function handleCardClick() {
    if (isDesktop && onSelect) {
      onSelect(post)
      return
    }
    router.push(post.href)
  }

  return (
    <article
      className={`home-feed-card${isSelected ? ' is-selected' : ''}`}
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
      <header className="home-feed-card__head">
        <Link
          href={`/${post.entity.slug}`}
          className="home-feed-card__author"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="home-feed-card__avatar" aria-hidden="true">
            {post.entity.avatarUrl ? (
              <Image src={post.entity.avatarUrl} alt="" width={32} height={32} />
            ) : (
              <span>{initial}</span>
            )}
          </span>
          <span className="home-feed-card__author-name truncate">{post.entity.displayName}</span>
        </Link>
        <span className="home-feed-card__badge">{KIND_LABELS[post.kind]}</span>
      </header>

      <div className="home-feed-card__media">
        <Image
          src={post.imageUrl}
          alt=""
          width={600}
          height={400}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="home-feed-card__body">
        <h2 className="home-feed-card__title">{post.title}</h2>
        {post.priceLabel ? <p className="home-feed-card__price">{post.priceLabel}</p> : null}
      </div>

      <HomeFeedActionBar post={post} />
    </article>
  )
}
