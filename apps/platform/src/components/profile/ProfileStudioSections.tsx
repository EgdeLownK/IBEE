'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import { PublicationFeedCard, type FeedPublication } from './publications/PublicationFeedCard'
import { PublicPublicationCard } from '@/components/public/PublicPublicationCard'

type Props = Pick<
  ProfileStudioData,
  | 'homeWidgets'
  | 'shopProducts'
  | 'playlistServices'
  | 'playlistEvents'
  | 'publications'
  | 'historyBlocks'
  | 'faqItems'
> & {
  activeType: string
  entitySlug: string
  entityDisplayName: string
  entityAvatarUrl: string | null
  webBaseUrl: string
  dashboardBaseUrl?: string
  onEditHistory?: () => void
  onPublicationUpdated?: (pub: FeedPublication) => void
  onPublicationDeleted?: (id: string) => void
  readOnly?: boolean
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatPrice(cents: number | null | undefined, currency: string | null | undefined) {
  if (cents == null) return null
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency ?? 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function Stars({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return <span className="text-[11px] text-neutral-400">Pas encore d&apos;avis</span>
  }
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i <= Math.round(average) ? 'fill-amber text-amber' : 'text-neutral-200'}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-neutral-800">{average.toFixed(1)}</span>
      <span className="text-[11px] text-neutral-500">({count})</span>
    </div>
  )
}

function ProductTile({
  href,
  editHref,
  title,
  detailExcerpt,
  imageUrl,
  priceCents,
  salePriceCents,
  currency,
  reviewAverage,
  reviewCount,
  meta,
}: {
  href: string | null
  editHref?: string | null
  title: string
  detailExcerpt: string
  imageUrl: string | null
  priceCents?: number | null
  salePriceCents?: number | null
  currency?: string | null
  reviewAverage?: number
  reviewCount?: number
  meta?: ReactNode
}) {
  const price =
    priceCents != null || salePriceCents != null
      ? formatPrice(salePriceCents ?? priceCents ?? null, currency ?? 'EUR')
      : null
  const was = salePriceCents != null ? formatPrice(priceCents ?? null, currency ?? 'EUR') : null
  const showReviews = reviewAverage != null && reviewCount != null

  return (
    <article className="tile tile--rich">
      {href && <Link className="tile__stretch" href={href} aria-label={title} />}
      <div className="tile__media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" />
        ) : null}
      </div>
      <div className="tile__body">
        <h3 className="tile__title m-0">{title}</h3>
        {meta}
        {price && (
          <p className="m-0 mt-1 text-sm font-semibold text-neutral-900">
            {price}
            {was && <span className="ml-1.5 text-xs font-normal text-neutral-400 line-through">{was}</span>}
          </p>
        )}
        {detailExcerpt && <p className="tile__detail-text">{detailExcerpt}</p>}
        {showReviews && <Stars average={reviewAverage} count={reviewCount} />}
      </div>
      {editHref && (
        <div className="tile__edit-wrap">
          <a href={editHref} className="tile__edit" onClick={(e) => e.stopPropagation()}>
            Modifier
          </a>
        </div>
      )}
    </article>
  )
}

export function ProfileStudioSections({
  activeType,
  homeWidgets,
  shopProducts,
  playlistServices,
  playlistEvents,
  publications,
  historyBlocks,
  faqItems,
  entitySlug,
  entityDisplayName,
  entityAvatarUrl,
  webBaseUrl,
  dashboardBaseUrl = '',
  onEditHistory,
  onPublicationUpdated,
  onPublicationDeleted,
  readOnly = false,
}: Props) {
  if (activeType === 'home') {
    return null
  }

  if (activeType === 'shop') {
    if (shopProducts.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucun produit pour le moment.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        <div className="grid-tiles">
          {shopProducts.map((p) => (
            <ProductTile
              key={p.id}
              href={p.slug ? `${webBaseUrl}/shop/${p.slug}` : null}
              editHref={dashboardBaseUrl ? `${dashboardBaseUrl}/products/${p.id}` : undefined}
              title={p.title}
              detailExcerpt={p.detailExcerpt}
              imageUrl={p.image_url}
              priceCents={p.price_cents}
              salePriceCents={p.sale_price_cents}
              currency={p.currency}
              reviewAverage={p.reviewAverage}
              reviewCount={p.reviewCount}
            />
          ))}
        </div>
      </div>
    )
  }

  if (activeType === 'appointments') {
    if (playlistServices.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucun service pour le moment.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        <div className="grid-tiles">
          {playlistServices.map((s) => (
            <ProductTile
              key={s.id}
              href={s.slug ? `${webBaseUrl}/services/${s.slug}` : null}
              editHref={dashboardBaseUrl ? `${dashboardBaseUrl}/services/${s.id}` : undefined}
              title={s.title}
              detailExcerpt={s.detailExcerpt}
              imageUrl={s.image_url}
              priceCents={s.promo_price_cents ?? s.price_cents}
              salePriceCents={s.promo_price_cents != null ? s.price_cents : null}
              currency={s.currency}
              reviewAverage={s.reviewAverage}
              reviewCount={s.reviewCount}
            />
          ))}
        </div>
      </div>
    )
  }

  if (activeType === 'events') {
    if (playlistEvents.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucun événement à venir.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        <div className="grid-tiles">
          {playlistEvents.map((ev) => (
            <ProductTile
              key={ev.id}
              href={ev.slug ? `${webBaseUrl}/events/${ev.slug}` : null}
              editHref={dashboardBaseUrl ? `${dashboardBaseUrl}/events/${ev.id}` : undefined}
              title={ev.title}
              detailExcerpt={ev.detailExcerpt}
              imageUrl={ev.image_url}
              meta={
                ev.start_at ? (
                  <p className="m-0 mt-1 text-xs text-neutral-500">{formatDate(ev.start_at)}</p>
                ) : null
              }
            />
          ))}
        </div>
      </div>
    )
  }

  if (activeType === 'news') {
    if (publications.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucune publication pour le moment.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        {publications.map((pub) =>
          readOnly ? (
            <PublicPublicationCard
              key={pub.id}
              publication={pub}
              entitySlug={entitySlug}
              entityDisplayName={entityDisplayName}
              entityAvatarUrl={entityAvatarUrl}
            />
          ) : (
            <PublicationFeedCard
              key={pub.id}
              publication={pub as FeedPublication}
              entitySlug={entitySlug}
              entityDisplayName={entityDisplayName}
              entityAvatarUrl={entityAvatarUrl}
              webBaseUrl={webBaseUrl}
              onUpdated={(updated) => onPublicationUpdated?.(updated)}
              onDeleted={(id) => onPublicationDeleted?.(id)}
            />
          )
        )}
      </div>
    )
  }

  if (activeType === 'history') {
    if (historyBlocks.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucune histoire pour le moment.</p>
          {onEditHistory && (
            <div className="profile-section__owner-edit">
              <button type="button" className="profile-section__edit-btn" onClick={onEditHistory}>
                Ajouter votre histoire
              </button>
            </div>
          )}
        </div>
      )
    }
    return (
      <div className="profile-section">
        {onEditHistory && (
          <div className="profile-section__owner-edit">
            <button type="button" className="profile-section__edit-btn" onClick={onEditHistory}>
              Modifier l&apos;histoire
            </button>
          </div>
        )}
        <div className="widget-stack">
          {historyBlocks.map((block, i) => {
            if (block.type === 'text') {
              return (
                <article key={i} className="widget">
                  <p className="m-0 text-sm leading-relaxed text-neutral-600 whitespace-pre-wrap">{block.content}</p>
                </article>
              )
            }
            if (block.type === 'image') {
              const imgs = block.images ?? []
              const slots = block.slot_count ?? imgs.length
              return (
                <article key={i} className="widget">
                  <div
                    className={`history-preview__row history-preview__row--${slots === 1 ? 'landscape' : 'square'}${slots === 3 ? ' history-preview__row--triple' : ''}`}
                  >
                    {imgs.map((img, j) => (
                      <div
                        key={j}
                        className={`history-preview__slot history-preview__slot--${slots === 1 ? 'landscape' : 'square'}`}
                        style={
                          slots === 1
                            ? ({ '--banner-aspect': String(img.aspect_ratio) } as CSSProperties)
                            : undefined
                        }
                      >
                        <img src={img.url} alt="" />
                      </div>
                    ))}
                  </div>
                </article>
              )
            }
            return null
          })}
        </div>
      </div>
    )
  }

  if (activeType === 'faq' && faqItems.length > 0) {
    return (
      <div className="profile-section">
        <div className="widget-stack">
          {faqItems.map((item, i) => (
            <article key={i} className="widget">
              <h3 className="widget__title m-0 mb-2">{item.question}</h3>
              <p className="m-0 text-sm leading-relaxed text-neutral-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-section">
      <p className="m-0 text-sm text-neutral-500">Section non disponible.</p>
    </div>
  )
}
