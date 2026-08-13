'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImageIcon } from 'lucide-react'
import type { HomeFeedPost } from '@ibee/shared'
import { formatFeedContextLine, formatFeedEntityInitials } from '@ibee/shared'

// 'offer' n'a pas d'entrée ici : son badge vient de post.badgeLabel
// (contractPill(contract_type).label, calculé côté fetch — voir
// apps/platform/src/lib/home-feed.ts, fetchJobOfferPosts). Ce Record ne sert
// plus qu'aux kinds product/event/service, tous morts depuis la mission
// accueil #3 (filtrage) mais gardés (voir home-feed.ts).
const KIND_LABELS: Record<Exclude<HomeFeedPost['kind'], 'offer'>, string> = {
  product: 'Produit',
  event: 'Événement',
  service: 'Service',
}

type Props = {
  post: HomeFeedPost
}

export function HomeFeedCard({ post }: Props) {
  const router = useRouter()
  const initials = formatFeedEntityInitials(post.entity.displayName) || '?'
  const contextLine = formatFeedContextLine(post.entity.location, post.sortAt)

  function handleCardClick() {
    router.push(post.href)
  }

  function stopRowClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  return (
    <article
      className="home-feed-card"
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
          onClick={stopRowClick}
        >
          <span className="home-feed-card__avatar" aria-hidden="true">
            {post.entity.avatarUrl ? (
              <Image src={post.entity.avatarUrl} alt="" width={38} height={38} />
            ) : (
              <span>{initials}</span>
            )}
          </span>
          <span className="home-feed-card__author-meta">
            <span className="home-feed-card__author-name truncate">{post.entity.displayName}</span>
            <span className="home-feed-card__context truncate">{contextLine}</span>
          </span>
        </Link>
      </header>

      <div className="home-feed-card__media">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt=""
            width={600}
            height={600}
            className="home-feed-card__media-img"
            loading="lazy"
          />
        ) : (
          <span className="home-feed-card__media-placeholder" aria-hidden="true">
            <ImageIcon className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
        <span className="home-feed-card__gradient" aria-hidden="true" />
        <div className="home-feed-card__overlay">
          <span className="home-feed-card__overlay-text">
            <span className="home-feed-card__badge">
              {post.badgeLabel ?? (post.kind === 'offer' ? '' : KIND_LABELS[post.kind])}
            </span>
            <span className="home-feed-card__title">{post.title}</span>
          </span>
          <Link href={post.href} className="home-feed-card__join" onClick={stopRowClick}>
            {post.ctaLabel}
          </Link>
        </div>
      </div>

      {post.priceLabel ? (
        <div className="home-feed-card__body">
          <p className="home-feed-card__price">{post.priceLabel}</p>
        </div>
      ) : null}

      {post.skills && post.skills.length > 0 ? (
        <div className="home-feed-card__skills">
          <span className="home-feed-card__skills-label">DEMANDÉ DANS L&apos;OFFRE</span>
          <span className="home-feed-card__skills-list">
            {post.skills.map((skill) => (
              <span key={skill.id} className="home-feed-card__skill">
                {skill.label}
              </span>
            ))}
          </span>
        </div>
      ) : null}
    </article>
  )
}
