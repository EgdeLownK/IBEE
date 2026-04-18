'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type CarouselMedia = {
  url: string
  alt_text?: string | null
  width?: number | null
  height?: number | null
}

type Props = {
  media: CarouselMedia[]
}

function getCropStyle(width: number | null | undefined, height: number | null | undefined): React.CSSProperties {
  if (!width || !height) {
    return { aspectRatio: '3/2', objectFit: 'cover', maxHeight: 400 }
  }
  const ratio = width / height
  if (ratio >= 1.91) {
    return { aspectRatio: '1.91/1', objectFit: 'cover' }
  }
  if (ratio >= 1) {
    return { aspectRatio: `${width}/${height}`, objectFit: 'contain', maxHeight: 400, background: 'var(--color-neutral-100)' }
  }
  if (ratio >= 0.8) {
    return { aspectRatio: `${width}/${height}`, objectFit: 'contain', maxHeight: 400, background: 'var(--color-neutral-100)' }
  }
  return { aspectRatio: '4/5', objectFit: 'cover' }
}

export function PublicationMediaCarousel({ media }: Props) {
  const [current, setCurrent] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= media.length) return
    setCurrent(index)
    const track = trackRef.current
    if (track && track.children[index]) {
      (track.children[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }, [media.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    function handleScroll() {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      scrollTimeout.current = setTimeout(() => {
        if (!track) return
        const scrollLeft = track.scrollLeft
        const slideWidth = track.offsetWidth
        const newIndex = Math.round(scrollLeft / slideWidth)
        if (newIndex >= 0 && newIndex < media.length) {
          setCurrent(newIndex)
        }
      }, 50)
    }

    track.addEventListener('scroll', handleScroll)
    return () => track.removeEventListener('scroll', handleScroll)
  }, [media.length])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1) }
  }

  if (media.length === 0) return null

  if (media.length === 1) {
    return (
      <div className="overflow-hidden">
        <img
          src={media[0].url}
          alt={media[0].alt_text ?? ''}
          className="w-full"
          style={getCropStyle(media[0].width, media[0].height)}
        />
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden">
      {/* Track */}
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory' } as React.CSSProperties}
        role="group"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-live="polite"
        onKeyDown={handleKeyDown}
      >
        {media.map((m, i) => (
          <div key={i} className="w-full flex-none snap-center" role="group" aria-roledescription="slide" aria-label={`Image ${i + 1} sur ${media.length}`}>
            <img src={m.url} alt={m.alt_text ?? ''} className="w-full" style={getCropStyle(m.width, m.height)} />
          </div>
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-3 right-3 rounded-full bg-neutral-900/60 px-2.5 py-1 text-xs font-medium text-white" aria-hidden="true">
        {current + 1}/{media.length}
      </div>

      {/* Arrows */}
      {current > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goTo(current - 1) }}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-0/90 text-neutral-600 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Image précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {current < media.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goTo(current + 1) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-0/90 text-neutral-600 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Image suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
        {media.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo(i) }}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === current ? 'bg-neutral-0' : 'bg-neutral-0/50'}`}
            aria-label={`Aller à l'image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
