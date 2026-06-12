import { createClient } from '@/lib/supabase/server'
import { parseDetailContentBlocks, parseFaqItems } from '@/lib/entity-content-blocks'
import { eventLocationLabel, formatDetailPrice } from '@/lib/detail-format'
import {
  countEventRegistrations,
  getEntityBySlug,
  getEntityByUserId,
  getEntityMenuSections,
  getEventBySlug,
} from '@ibee/supabase'

export const EVENT_PROFILE_RELATED_MOCK = [
  { kind: 'event' as const, title: 'Atelier en ligne', meta: 'Événement · 12 juin' },
  { kind: 'service' as const, title: 'Séance de coaching', meta: 'Service · 60 min' },
  { kind: 'product' as const, title: 'Guide complet (PDF)', meta: 'Produit · 19 €' },
  { kind: 'event' as const, title: 'Conférence annuelle', meta: 'Événement · 5 juillet' },
  { kind: 'product' as const, title: 'Pack ressources', meta: 'Produit · 39 €' },
]

export const EVENT_SIMILAR_RELATED_MOCK = [
  { kind: 'event' as const, title: 'Événement à découvrir', meta: 'Événement · 20 juin' },
  { kind: 'service' as const, title: 'Prestation similaire', meta: 'Service · 45 min' },
  { kind: 'product' as const, title: 'Produit similaire', meta: 'Produit · 24 €' },
  { kind: 'event' as const, title: 'Autre rendez-vous', meta: 'Événement · 1 août' },
  { kind: 'service' as const, title: 'Service recommandé', meta: 'Service · 30 min' },
]

export async function loadPublicEvent(slug: string, eventSlug: string) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const event = await getEventBySlug(supabase, entity.id, eventSlug)
  if (!event || !event.is_published) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let registrationsCount = 0
  try {
    registrationsCount = await countEventRegistrations(supabase, event.id)
  } catch {
    registrationsCount = 0
  }

  const remaining = event.capacity != null ? Math.max(0, event.capacity - registrationsCount) : null
  const isFull = remaining !== null && remaining <= 0
  const isPast = new Date(event.start_at).getTime() <= Date.now()
  const statusAvailable = !isPast && !isFull

  const start = new Date(event.start_at)
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start)
  const dayChip = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(start)
  const monthChip = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
    .format(start)
    .replace('.', '')
  const timeLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(start)
  const endTimeLabel = event.end_at
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.end_at))
    : null

  const locLabel = eventLocationLabel(event.location_type)
  const priceText = formatDetailPrice(event.price_cents, event.currency)

  const placesStat = remaining !== null
    ? { value: isFull ? 'Complet' : String(remaining), state: (statusAvailable ? 'success' : 'error') as 'success' | 'error' }
    : { value: isPast ? 'Terminé' : 'Ouvert', state: (statusAvailable ? 'success' : 'error') as 'success' | 'error' }

  const stats = [
    { label: 'Date', value: `${dayChip} ${monthChip}`, valueSmall: true },
    { label: 'Prix', value: priceText, valueSmall: true, valueDark: true },
    { label: 'Lieu', value: locLabel, valueSmall: true },
    { label: 'Places', value: placesStat.value, valueSmall: true, state: placesStat.state },
  ]

  const detailRows: { label: string; value: string }[] = [
    { label: 'Date', value: dateLabel },
    { label: 'Horaire', value: endTimeLabel ? `${timeLabel} — ${endTimeLabel}` : timeLabel },
    {
      label: 'Lieu',
      value: event.location_details ? `${locLabel} · ${event.location_details}` : locLabel,
    },
    ...(remaining !== null
      ? [
          {
            label: 'Places',
            value: isFull ? 'Complet' : `${remaining} restante${remaining > 1 ? 's' : ''}`,
          },
        ]
      : []),
  ]

  const faq = parseFaqItems(event.faq)
  const detailContentBlocks = parseDetailContentBlocks({
    content_blocks: event.content_blocks,
    description: event.description,
  })
  const textContent = detailContentBlocks
    .filter((b): b is { type: 'text'; content: string } => b.type === 'text')
    .map((b) => b.content)
    .join(' ')

  const eventMedia = Array.isArray(event.gallery_images)
    ? event.gallery_images.filter((u): u is string => typeof u === 'string').map((url) => ({ url }))
    : []
  const coverImage = eventMedia[0]?.url ?? null

  const menuSections = await getEntityMenuSections(supabase, entity.id)

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const profileUrl = `${siteUrl}/${entity.slug}`
  const eventUrl = `${siteUrl}/${entity.slug}/events/${event.slug}`

  const description =
    event.description ??
    (textContent ? textContent.slice(0, 160) + (textContent.length > 160 ? '...' : '') : `${event.title} — Événement par ${entity.display_name}`)

  let bookerName = ''
  let bookerEmail = ''
  if (user) {
    bookerEmail = user.email ?? ''
    const bookerEntity = await getEntityByUserId(supabase, user.id)
    bookerName = bookerEntity?.display_name ?? user.email?.split('@')[0] ?? ''
  }

  return {
    entity: {
      id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
    },
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      start_at: event.start_at,
      end_at: event.end_at,
      location_type: event.location_type,
      location_details: event.location_details,
      price_cents: event.price_cents,
      currency: event.currency,
      capacity: event.capacity,
    },
    detailContentBlocks,
    faq,
    stats,
    detailRows,
    eventMedia,
    coverImage,
    priceText,
    locLabel,
    dayChip,
    monthChip,
    hasNews: menuSections.some((s) => s.type === 'news'),
    isFull,
    isPast,
    statusAvailable,
    isAuthenticated: !!user,
    bookerName,
    bookerEmail,
    siteUrl,
    profileUrl,
    eventUrl,
    backHref: `/${entity.slug}#events`,
    profileHref: `/${entity.slug}`,
    description,
    textContent,
    profileRelated: EVENT_PROFILE_RELATED_MOCK,
    similarRelated: EVENT_SIMILAR_RELATED_MOCK,
  }
}

export type PublicEventData = NonNullable<Awaited<ReturnType<typeof loadPublicEvent>>>
