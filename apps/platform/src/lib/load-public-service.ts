import { createClient } from '@/lib/supabase/server'
import { descriptionFromBlocks, parseDetailContentBlocks, parseFaqItems } from '@/lib/entity-content-blocks'
import { formatDetailPrice, locationLabel, parseReviewRatings } from '@/lib/detail-format'
import {
  getAppointmentTypeBySlug,
  getEntityBySlug,
  getEntityMenuSections,
  getServiceReviewAggregates,
  listPublishedServiceReviews,
} from '@ibee/supabase'

export const PROFILE_RELATED_MOCK = [
  { kind: 'service' as const, title: 'Séance de coaching', meta: 'Service · 60 min' },
  { kind: 'product' as const, title: 'Guide complet (PDF)', meta: 'Produit · 19 €' },
  { kind: 'event' as const, title: 'Atelier en ligne', meta: 'Événement · 12 juin' },
  { kind: 'product' as const, title: 'Pack ressources', meta: 'Produit · 39 €' },
  { kind: 'service' as const, title: 'Audit personnalisé', meta: 'Service · sur devis' },
]

export const SIMILAR_RELATED_MOCK = [
  { kind: 'service' as const, title: 'Prestation similaire', meta: 'Service · 45 min' },
  { kind: 'event' as const, title: 'Événement à découvrir', meta: 'Événement · 20 juin' },
  { kind: 'product' as const, title: 'Produit similaire', meta: 'Produit · 24 €' },
  { kind: 'service' as const, title: 'Service recommandé', meta: 'Service · 30 min' },
  { kind: 'product' as const, title: 'Autre suggestion', meta: 'Produit · 15 €' },
]

export async function loadPublicService(
  slug: string,
  serviceSlug: string,
  searchParams?: { rating?: string; sort?: string }
) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const entityRow = entity as typeof entity & { banner_url?: string | null }

  const service = await getAppointmentTypeBySlug(supabase, entity.id, serviceSlug)
  if (!service || !service.is_active) return null

  const activeRatings = parseReviewRatings(searchParams?.rating)
  const activeSort: 'recent' | 'oldest' = searchParams?.sort === 'oldest' ? 'oldest' : 'recent'

  const [reviews, aggregates, allRatings, menuSections] = await Promise.all([
    listPublishedServiceReviews(supabase, service.id, {
      ratings: activeRatings,
      sortBy: activeSort,
      limit: 50,
    }),
    getServiceReviewAggregates(supabase, service.id),
    listPublishedServiceReviews(supabase, service.id, { limit: 500 }),
    getEntityMenuSections(supabase, entity.id),
  ])

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of allRatings) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1
  }

  const faq = parseFaqItems(service.faq)
  const detailContentBlocks = parseDetailContentBlocks(service)
  const textContent = detailContentBlocks
    .filter((b): b is { type: 'text'; content: string } => b.type === 'text')
    .map((b) => b.content)
    .join(' ')

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const profileUrl = `${siteUrl}/${entity.slug}`
  const serviceUrl = `${siteUrl}/${entity.slug}/services/${service.slug}`
  const basePath = `/${entity.slug}/services/${service.slug}`

  const priceText = formatDetailPrice(service.price_cents, service.currency)
  const locLabel = locationLabel(service.location_type)

  const serviceMedia = Array.isArray(service.gallery_images)
    ? service.gallery_images
        .filter((u): u is string => typeof u === 'string')
        .map((url) => ({ url }))
    : []

  const stats = [
    {
      label: aggregates.count > 0 ? `${aggregates.count} avis` : 'Avis',
      value: aggregates.count > 0 ? aggregates.average.toFixed(1).replace('.', ',') : '—',
      stars: aggregates.average,
      href: '#avis',
    },
    { label: 'Prix', value: priceText, valueSmall: true, valueDark: true },
    { label: 'Durée', value: `${service.duration_minutes} min`, valueSmall: true },
    { label: 'Lieu', value: locLabel, valueSmall: true },
  ]

  const detailRows = [
    { label: 'Durée', value: `${service.duration_minutes} min` },
    { label: 'Lieu', value: locLabel },
    { label: 'Tarif', value: priceText },
  ]

  return {
    entity: {
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
      banner_url: entityRow.banner_url ?? null,
    },
    service: {
      id: service.id,
      title: service.title,
      slug: service.slug,
      duration_minutes: service.duration_minutes,
      location_type: service.location_type,
      price_cents: service.price_cents,
      currency: service.currency,
    },
    detailContentBlocks,
    faq,
    reviews,
    aggregates,
    distribution,
    activeRatings,
    activeSort,
    stats,
    detailRows,
    serviceMedia,
    priceText,
    locLabel,
    hasNews: menuSections.some((s) => s.type === 'news'),
    siteUrl,
    profileUrl,
    serviceUrl,
    basePath,
    backHref: `/${entity.slug}#appointments`,
    profileHref: `/${entity.slug}`,
    bookingHref: `/${entity.slug}/services/${service.slug}/booking`,
    description: descriptionFromBlocks(
      detailContentBlocks,
      `${service.title} — Service par ${entity.display_name}`
    ),
    textContent,
    profileRelated: PROFILE_RELATED_MOCK,
    similarRelated: SIMILAR_RELATED_MOCK,
  }
}

export type PublicServiceData = NonNullable<Awaited<ReturnType<typeof loadPublicService>>>
