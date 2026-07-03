'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeDateFr } from '@/lib/format-date-fr'
import { useHorizontalCarousel } from '@/hooks/useHorizontalCarousel'

const MOCK_ITEMS = [
  { title: 'Une nouveauté à découvrir', slug: '', publishedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { title: 'Retour sur le mois écoulé', slug: '', publishedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { title: 'Coulisses du projet', slug: '', publishedAt: new Date(Date.now() - 21 * 86400000).toISOString() },
  { title: 'Les prochaines sorties', slug: '', publishedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { title: 'Merci pour votre soutien', slug: '', publishedAt: new Date(Date.now() - 35 * 86400000).toISOString() },
]

interface Props {
  entitySlug: string
  profileBaseHref?: string
  showHeader?: boolean
}

export function NewsWidget({ entitySlug, profileBaseHref, showHeader = true }: Props) {
  const profileBase = profileBaseHref ?? `/${entitySlug}`
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(14, 'nwidget__card')

  const items = MOCK_ITEMS.map((item) => ({
    title: item.title,
    href: item.slug ? `${profileBase}/news/${item.slug}` : `${profileBase}#news`,
    date: formatRelativeDateFr(item.publishedAt),
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
                <span className="nwidget__badge">News</span>
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
