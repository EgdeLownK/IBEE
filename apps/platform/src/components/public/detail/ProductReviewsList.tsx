import { ArrowDownUp, Star, X } from 'lucide-react'
import Link from 'next/link'

type Review = {
  id: string
  rating: number
  title: string | null
  content: string
  created_at: string
  is_verified_purchase: boolean
  seller_reply: string | null
}

interface Props {
  reviews: Review[]
  aggregates: { count: number; average: number }
  distribution: Record<number, number>
  activeRatings?: number[]
  activeSort?: 'recent' | 'oldest'
  basePath: string
}

function starRow(n: number) {
  return Array.from({ length: 5 }, (_, i) => i < n)
}

function buildQuery(
  basePath: string,
  activeRatings: number[],
  activeSort: 'recent' | 'oldest',
  opts: { toggleRating?: number; clearRatings?: boolean; sort?: 'recent' | 'oldest' } = {},
) {
  let ratings = [...activeRatings]
  if (opts.toggleRating != null) {
    ratings = ratings.includes(opts.toggleRating)
      ? ratings.filter((r) => r !== opts.toggleRating)
      : [...ratings, opts.toggleRating]
  }
  if (opts.clearRatings) ratings = []
  const sort = opts.sort ?? activeSort
  const params = new URLSearchParams()
  if (ratings.length > 0) params.set('rating', ratings.sort((a, b) => b - a).join(','))
  if (sort !== 'recent') params.set('sort', sort)
  const qs = params.toString()
  return qs ? `${basePath}?${qs}#avis` : `${basePath}#avis`
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d))
}

export function ProductReviewsList({
  reviews,
  aggregates,
  distribution,
  activeRatings = [],
  activeSort = 'recent',
  basePath,
}: Props) {
  const maxDist = Math.max(1, ...Object.values(distribution))

  return (
    <section id="avis" className="sec">
      <div className="reviews-heading">
        <span>Les avis clients</span>
        <h2>Avis clients</h2>
      </div>

      <div className="reviews-cq mt-5">
        <div className="reviews-grid">
          <div className="reviews-stats">
            <div className="reviews-score">
              <p className="reviews-score__number">
                {aggregates.average.toFixed(1).replace('.', ',')}
                <span className="reviews-score__max">sur 5</span>
              </p>
              <div className="reviews-score__stars">
                {starRow(Math.round(aggregates.average)).map((on, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${on ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="reviews-score__count">{aggregates.count} avis</p>
            </div>

            <div className="reviews-distribution">
              {[5, 4, 3, 2, 1].map((n) => {
                const selected = activeRatings.includes(n)
                return (
                  <Link
                    key={n}
                    href={buildQuery(basePath, activeRatings, activeSort, { toggleRating: n })}
                    aria-current={selected ? 'true' : undefined}
                    className={`reviews-bar${selected ? ' is-selected' : ''}`}
                  >
                    <span
                      className={`reviews-bar__stars ${selected ? 'text-accent' : 'text-amber-500'}`}
                    >
                      {Array.from({ length: n }, (_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" aria-hidden="true" />
                      ))}
                    </span>
                    <span className="reviews-bar__track">
                      <span
                        className="reviews-bar__fill"
                        style={{ width: `${((distribution[n] ?? 0) / maxDist) * 100}%` }}
                      />
                    </span>
                    <span className="reviews-bar__count">{distribution[n] ?? 0}</span>
                  </Link>
                )
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {activeRatings.length > 0 && (
                <Link
                  href={buildQuery(basePath, activeRatings, activeSort, { clearRatings: true })}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                >
                  {activeRatings.join(' · ')} étoile
                  {activeRatings.length > 1 || activeRatings[0]! > 1 ? 's' : ''}
                  <X className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
              <Link
                href={buildQuery(basePath, activeRatings, activeSort, {
                  sort: activeSort === 'recent' ? 'oldest' : 'recent',
                })}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200"
              >
                <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                {activeSort === 'recent' ? "Plus récents d'abord" : "Plus anciens d'abord"}
              </Link>
            </div>
          </div>

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">
                Aucun avis pour le moment.
              </p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="review-item">
                  <div className="review-item__top">
                    <div className="review-item__stars">
                      {starRow(review.rating).map((on, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${on ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className="review-item__score">{review.rating}/5</span>
                    {review.is_verified_purchase && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                        Achat vérifié
                      </span>
                    )}
                    <time className="ml-auto text-xs text-neutral-400" dateTime={review.created_at}>
                      {fmtDate(review.created_at)}
                    </time>
                  </div>
                  {review.title && (
                    <h3 className="mt-2 text-sm font-semibold text-neutral-900">{review.title}</h3>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                    {review.content}
                  </p>
                  {review.seller_reply && (
                    <div className="review-item__reply">
                      <p className="text-xs font-semibold text-neutral-900">Réponse du vendeur</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                        {review.seller_reply}
                      </p>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
