import { PublicationMediaCarousel } from './PublicationMediaCarousel'

type Props = {
  title: string
  content: string | null
  imageUrls: string[]
}

export function PublicationCardPreview({ title, content, imageUrls }: Props) {
  const hasContent =
    title.trim().length > 0 || (content && content.trim().length > 0) || imageUrls.length > 0

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-0 px-8 py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <svg
            className="h-5 w-5 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-neutral-600">Aperçu de votre publication</p>
        <p className="mt-1 text-xs text-neutral-400">Commencez à taper pour voir le rendu</p>
      </div>
    )
  }

  const carouselMedia = imageUrls.map((url) => ({ url, alt_text: null, width: null, height: null }))

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-sm">
      {/* Zone 1 — Meta */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent-soft" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Votre profil</p>
            <p className="text-xs text-neutral-400">À l'instant</p>
          </div>
        </div>
      </div>

      {/* Zone 2 — Body */}
      <div className="px-6 pt-3 pb-4">
        <h3 className="text-base font-semibold leading-snug text-neutral-900">
          {title.trim() || (
            <span className="text-neutral-400 italic">Titre de votre publication</span>
          )}
        </h3>
        {content && content.trim().length > 0 && (
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {content}
          </p>
        )}
      </div>

      {/* Images — Carousel */}
      {carouselMedia.length > 0 && (
        <div className="pb-3">
          <PublicationMediaCarousel media={carouselMedia} />
        </div>
      )}

      {/* Footer — engagement bar (visual only) */}
      <div className="flex items-center gap-6 border-t border-neutral-100 px-6 py-3">
        <span className="text-xs text-neutral-400">♡ J'aime</span>
        <span className="text-xs text-neutral-400">💬 Commenter</span>
        <span className="text-xs text-neutral-400">↗ Partager</span>
      </div>
    </article>
  )
}
