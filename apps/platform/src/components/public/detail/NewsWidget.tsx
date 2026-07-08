'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeDateFr } from '@/lib/format-date-fr'
import { useHorizontalCarousel } from '@/hooks/useHorizontalCarousel'



interface Props {
  entitySlug: string
  profileBaseHref?: string
  showHeader?: boolean
  items?: { id: string; title: string; slug: string; published_at: string | null; cover_url?: string | null }[]
}

export function NewsWidget({ entitySlug, profileBaseHref, showHeader = true, items: propsItems = [] }: Props) {
  const profileBase = profileBaseHref ?? `/${entitySlug}`
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(14, 'nwidget__card')

  const items = propsItems.map((item) => ({
    title: item.title,
    href: `${profileBase}/news/${item.slug}`,
    date: formatRelativeDateFr(item.published_at ?? new Date().toISOString()),
    cover_url: item.cover_url,
  }))

  return (
    <section className="nwidget">
      {showHeader && (
        <div className="nwidget__head">
          <h2 className="nwidget__title">Actualités</h2>
          <Link href={`${profileBase}#news`} className="nwidget__more">
            Voir plus
          </Link>
        </div>
      )}

      <div className="nwidget__carousel">
        <div ref={trackRef} className="nwidget__track">
          {items.map((n, i) => (
            <Link key={i} href={n.href} className="nwidget__card carousel-slide">
              <div className="nwidget__media" aria-hidden="true">
                {n.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.cover_url} alt={n.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="nwidget__badge">News</span>
                )}
              </div>
              <div className="nwidget__body">
                <h3 className="nwidget__name">{n.title}</h3>
                <p className="nwidget__meta">{n.date}</p>
              </div>
            </Link>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              className="nwidget__nav nwidget__nav--prev"
              aria-label="Actualité précédente"
              disabled={!canPrev}
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="nwidget__nav nwidget__nav--next"
              aria-label="Actualité suivante"
              disabled={!canNext}
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}
