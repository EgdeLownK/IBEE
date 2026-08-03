'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHorizontalCarousel } from '../hooks/useHorizontalCarousel'

export type MediaGalleryItem = {
  url: string
  media_type?: 'image' | 'video' | string | null
  alt_text?: string | null
}

type Props = {
  media: MediaGalleryItem[]
  /** Repli d'alt text pour les images sans alt_text propre. */
  title: string
}

/**
 * Copie a l'identique du carrousel "boutique" (ProductDetail.tsx /
 * EntityDetailBody.tsx, apps/platform/src/components/public/detail/) --
 * meme markup, meme CSS (media-gallery-carousel.css, memes valeurs, meme
 * media query 768px que .product-detail__carousel / .edb__carousel).
 * Cree pour la page detail offre d'emploi (PublicJobOfferDetail) sans
 * toucher aux deux implementations existantes : extraire un composant
 * partage aurait modifie trois surfaces hors MVP (boutique, services,
 * evenements) sans filet de test, pour une mission dont le sujet est
 * l'affichage des medias d'offre (decision Killian, phase 0 de
 * feat/job-offer-media-display).
 *
 * VOLONTAIRE : ce composant a vocation a remplacer ProductDetail/
 * EntityDetailBody dans une mission ulterieure couverte par des tests --
 * ne pas creer un 4e carrousel a cote, etendre celui-ci.
 */
export function MediaGalleryCarousel({ media, title }: Props) {
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(
    12,
    'media-gallery__slide',
  )

  if (media.length === 0) return null

  return (
    <div className="media-gallery">
      <div ref={trackRef} className="media-gallery__carousel">
        {media.map((m, i) => (
          <div key={i} className="media-gallery__slide">
            {m.media_type === 'video' ? (
              <video
                src={m.url}
                controls
                preload="metadata"
                playsInline
                className="h-full w-full bg-black object-cover"
              />
            ) : (
              <img
                src={m.url}
                alt={m.alt_text ?? title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>
      {media.length > 1 && (
        <>
          <button
            type="button"
            className="media-gallery__nav media-gallery__nav--prev"
            aria-label="Média précédent"
            disabled={!canPrev}
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="media-gallery__nav media-gallery__nav--next"
            aria-label="Média suivant"
            disabled={!canNext}
            onClick={scrollNext}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  )
}
