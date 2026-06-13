'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useHorizontalCarousel } from '@/hooks/useHorizontalCarousel'

type Kind = 'service' | 'product' | 'event'

type RelatedItem = {
  kind: Kind
  title: string
  meta: string
  href?: string
}

const KIND_LABEL: Record<Kind, string> = {
  service: 'Service',
  product: 'Produit',
  event: 'Événement',
}

interface Props {
  title: string
  items: RelatedItem[]
  moreHref?: string
}

export function RelatedContent({ title, items, moreHref = '#' }: Props) {
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(14, 'related__card')

  if (items.length === 0) return null

  return (
    <section className="related">
      <div className="related__head">
        <h2 className="related__title">{title}</h2>
        <Link href={moreHref} className="related__more">
          Voir plus
        </Link>
      </div>

      <div className="related__carousel">
        <div ref={trackRef} className="related__track">
          {items.map((it, i) => {
            const card = (
              <>
                <div className="related__media" aria-hidden="true">
                  <span className="related__badge">{KIND_LABEL[it.kind]}</span>
                </div>
                <div className="related__body">
                  <h3 className="related__name">{it.title}</h3>
                  <p className="related__meta">{it.meta}</p>
                </div>
              </>
            )
            return it.href ? (
              <Link key={i} href={it.href} className="related__card carousel-slide">
                {card}
              </Link>
            ) : (
              <article key={i} className="related__card carousel-slide">
                {card}
              </article>
            )
          })}
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              className="related__nav related__nav--prev"
              aria-label="Contenu précédent"
              disabled={!canPrev}
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="related__nav related__nav--next"
              aria-label="Contenu suivant"
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
