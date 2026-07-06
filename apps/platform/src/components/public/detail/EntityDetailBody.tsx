'use client'

import type { LucideIcon } from 'lucide-react'
import { CalendarDays, ChevronLeft, ChevronRight, ShoppingBag, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useHorizontalCarousel } from '@/hooks/useHorizontalCarousel'
import type { DetailContentBlock } from '@/lib/entity-content-blocks'
import { EntityMoreDetails } from './EntityMoreDetails'
import { NewsWidget } from './NewsWidget'

type Media = { url: string; mediaType?: string | null; alt?: string }

type Stat = {
  label: string
  value: string
  valueSmall?: boolean
  valueDark?: boolean
  stars?: number | null
  href?: string
  state?: 'success' | 'error' | null
}

type DetailRow = { label: string; value: string }

interface Props {
  media?: Media[]
  placeholderIcon?: LucideIcon
  stats: Stat[]
  ctaHref?: string
  ctaLabel?: string
  detailRows: DetailRow[]
  entitySlug?: string
  entityKind: 'service' | 'event'
  contentBlocks?: DetailContentBlock[]
  fallbackText?: string | null
  hasNews?: boolean
  profileBaseHref?: string
  title: string
}

function starRow(n: number) {
  return Array.from({ length: 5 }, (_, i) => i < n)
}

export function EntityDetailBody({
  title,
  media = [],
  placeholderIcon: PlaceholderIcon = ShoppingBag,
  stats,
  ctaHref,
  ctaLabel = 'Réserver',
  detailRows,
  entitySlug = '',
  entityKind,
  contentBlocks = [],
  fallbackText = null,
  hasNews = false,
  profileBaseHref,
}: Props) {
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(12, 'edb__slide')

  return (
    <div className="edb">
      <div className="edb__stats">
        {stats.map((s, i) => {
          const inner = (
            <>
              <span className="edb__stat-label">{s.label}</span>
              <span
                className={[
                  'edb__stat-value',
                  s.valueSmall && 'edb__stat-value--sm',
                  s.valueDark && 'edb__stat-value--dark',
                  s.state === 'success' && 'is-available',
                  s.state === 'error' && 'is-unavailable',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {s.value}
              </span>
              {s.stars != null && s.stars > 0 && (
                <span className="edb__stat-stars">
                  {starRow(Math.round(s.stars)).map((on, j) => (
                    <Star
                      key={j}
                      className={`h-[11px] w-[11px] ${on ? 'fill-neutral-900 text-neutral-900' : 'text-neutral-300'}`}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              )}
            </>
          )
          return s.href ? (
            <a key={i} className="edb__stat" href={s.href}>
              {inner}
            </a>
          ) : (
            <div key={i} className="edb__stat">
              {inner}
            </div>
          )
        })}
      </div>

      <div className="edb__media">
        <div ref={trackRef} className="edb__carousel gallery-strip">
          {media.length > 0 ? (
            media.map((m, i) => (
              <div key={i} className="edb__slide carousel-slide">
                {m.mediaType === 'video' ? (
                  <video src={m.url} controls preload="metadata" playsInline className="h-full w-full bg-black object-cover" />
                ) : (
                  <Image src={m.url} alt={m.alt ?? title} className="h-full w-full object-cover" width={800} height={600} loading="lazy" />
                )}
              </div>
            ))
          ) : (
            <div className="edb__slide carousel-slide">
              <div className="edb__ph" aria-hidden="true">
                {entityKind === 'service' || entityKind === 'event' ? (
                  <CalendarDays className="h-14 w-14" aria-hidden="true" />
                ) : (
                  <PlaceholderIcon className="h-14 w-14" aria-hidden="true" />
                )}
              </div>
            </div>
          )}
        </div>
        {media.length > 1 && (
          <>
            <button
              type="button"
              className="edb__nav edb__nav--prev"
              aria-label="Image précédente"
              disabled={!canPrev}
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="edb__nav edb__nav--next"
              aria-label="Image suivante"
              disabled={!canNext}
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className="edb__buybox-card" id="tous-les-details">
        {ctaHref && (
          <div className="edb__buybox-top">
            <Link href={ctaHref} className="edb__cta">
              {ctaLabel}
            </Link>
          </div>
        )}
        {detailRows.length > 0 && (
          <div className="edb__buybox-info">
            <h3 className="edb__info-title">Information</h3>
            <div className="edb__info-menus">
              <details className="edb__tech-menu">
                <summary>
                  <span>Information générale</span>
                  <span className="edb__tech-chevron" aria-hidden="true">
                    <ChevronRight className="h-[18px] w-[18px]" />
                  </span>
                </summary>
                <div className="edb__tech-panel">
                  {detailRows.map((row, i) => (
                    <div key={i} className="edb__tech-line">
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

      <EntityMoreDetails
        entityKind={entityKind}
        contentBlocks={contentBlocks}
        fallbackText={fallbackText}
      />
      {hasNews && entitySlug && (
        <NewsWidget entitySlug={entitySlug} profileBaseHref={profileBaseHref} />
      )}
    </div>
  )
}
