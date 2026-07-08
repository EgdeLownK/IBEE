import { createClient } from '@/lib/supabase/server'
import { parseDetailContentBlocks, parseFaqItems } from '@/lib/entity-content-blocks'
import { eventLocationLabel, formatDetailPrice } from '@/lib/detail-format'
import {
  formatCancellationPolicyLabel,
  parseEventRegistrationFields,
  type EventRegistrationField,
} from '@/lib/event-registration-fields'
import {
  countEventActivityHolds,
  countEventTicketHolds,
  getEntityBySlug,
  getEntityByUserId,
  getEntityContactInfo,
  getEntityMenuSections,
  getEventBySlug,
  getConfirmedEventRegistrationByEmail,
  isEventActivityPast,
  isEventTicketOnSale,
  listActivitiesByEvent,
  listTicketTypesByEvent,
  resolveEventTicketPriceCents,
} from '@ibee/supabase'
import { formatEventCardTime } from '@/lib/event-catalog-view'
import { createServiceClient } from '@/lib/supabase/admin'
import { resolveDefaultEventRegistration } from '@/lib/resolve-default-event-registration'

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
  { kind: 'product' as const, title: 'Produit similaire', meta: '', price_cents: 2400 },
  { kind: 'event' as const, title: 'Autre rendez-vous', meta: 'Événement · 1 août' },
  { kind: 'service' as const, title: 'Service recommandé', meta: 'Service · 30 min' },
]

export async function loadPublicEvent(slug: string, eventSlug: string) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const entityRow = entity as typeof entity & { banner_url?: string | null }

  const event = await getEventBySlug(supabase, entity.id, eventSlug)
  if (!event || !event.is_published) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let registrationsCount = 0
  try {
    registrationsCount = await countEventTicketHolds(supabase, event.id)
  } catch {
    registrationsCount = 0
  }

  const ticketTypesRaw = await listTicketTypesByEvent(supabase, event.id).catch(() => [])
  const activitiesRaw = await listActivitiesByEvent(supabase, event.id, { publishedOnly: true }).catch(
    () => []
  )

  const ticketTypesAll = ticketTypesRaw
    .filter((t) => isEventTicketOnSale(t))
    .map((t) => {
      const priceCents = resolveEventTicketPriceCents(t)
      return {
        id: t.id,
        activityId: t.activity_id,
        title: t.title,
        slug: t.slug,
        priceCents,
        currency: t.currency,
        priceLabel: formatDetailPrice(priceCents, t.currency),
      }
    })

  const activities = await Promise.all(
    activitiesRaw.map(async (activity) => {
      let holds = 0
      try {
        holds = await countEventActivityHolds(supabase, activity.id)
      } catch {
        holds = 0
      }
      const remaining =
        activity.capacity != null ? Math.max(0, activity.capacity - holds) : null
      const isFull = remaining !== null && remaining <= 0
      const isPast = isEventActivityPast(activity)

      return {
        id: activity.id,
        title: activity.title,
        slug: activity.slug,
        startAt: activity.start_at,
        endAt: activity.end_at,
        capacity: activity.capacity,
        remaining,
        isFull,
        isPast,
        statusAvailable: !isPast && !isFull,
        slotLabel: formatEventCardTime(activity.start_at, activity.end_at),
        ticketTypes: ticketTypesAll.filter((ticket) => ticket.activityId === activity.id),
      }
    })
  )

  const hasActivities = activities.length > 0
  const ticketTypes = hasActivities
    ? ticketTypesAll.filter((ticket) => ticket.activityId != null)
    : ticketTypesAll

  const onSalePrices = ticketTypes.map((t) => t.priceCents)
  const minTicketPrice = onSalePrices.length > 0 ? Math.min(...onSalePrices) : null
  const maxTicketPrice = onSalePrices.length > 0 ? Math.max(...onSalePrices) : null

  const registrationFields: EventRegistrationField[] = parseEventRegistrationFields(
    event.registration_fields
  )
  const cancellationPolicyLabel = formatCancellationPolicyLabel(event.cancel_min_hours ?? 24)

  const remaining = event.capacity != null ? Math.max(0, event.capacity - registrationsCount) : null
  const activityCapacities = activities.map((activity) => activity.capacity)
  const allActivitiesHaveCapacity =
    hasActivities && activityCapacities.length > 0 && activityCapacities.every((capacity) => capacity != null)
  const totalCapacity = hasActivities
    ? allActivitiesHaveCapacity
      ? activityCapacities.reduce((sum, capacity) => sum + (capacity ?? 0), 0)
      : null
    : event.capacity
  const totalRemaining = hasActivities
    ? allActivitiesHaveCapacity
      ? activities.reduce((sum, activity) => sum + (activity.remaining ?? 0), 0)
      : null
    : remaining
  const isFull = hasActivities
    ? activities.every((activity) => !activity.statusAvailable)
    : remaining !== null && remaining <= 0
  const isPast = hasActivities
    ? activities.every((activity) => activity.isPast)
    : new Date(event.start_at).getTime() <= Date.now()
  const statusAvailable = hasActivities
    ? activities.some((activity) => activity.statusAvailable && activity.ticketTypes.length > 0)
    : !isPast && !isFull

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
  const priceText =
    minTicketPrice != null && maxTicketPrice != null && minTicketPrice !== maxTicketPrice
      ? `À partir de ${formatDetailPrice(minTicketPrice, event.currency)}`
      : minTicketPrice != null
        ? formatDetailPrice(minTicketPrice, event.currency)
        : formatDetailPrice(event.price_cents, event.currency)

  const placesStat = totalCapacity !== null
    ? {
        value:
          totalRemaining !== null && totalRemaining <= 0
            ? 'Complet'
            : `${totalRemaining ?? '—'} / ${totalCapacity}`,
        state: (statusAvailable ? 'success' : 'error') as 'success' | 'error',
      }
    : {
        value: isPast ? 'Terminé' : 'Ouvert',
        state: (statusAvailable ? 'success' : 'error') as 'success' | 'error',
      }

  const stats = [
    { label: 'Date', value: `${dayChip} ${monthChip}`, valueSmall: true },
    { label: 'Prix', value: priceText, valueSmall: true, valueDark: true },
    { label: 'Lieu', value: locLabel, valueSmall: true },
    ...(totalCapacity !== null
      ? [
          {
            label: 'Places totales',
            value: String(totalCapacity),
            valueSmall: true,
            valueDark: true,
          },
          {
            label: 'Restantes',
            value:
              totalRemaining !== null && totalRemaining <= 0
                ? 'Complet'
                : String(totalRemaining ?? '—'),
            valueSmall: true,
            state: placesStat.state,
          },
        ]
      : [{ label: 'Places', value: placesStat.value, valueSmall: true, state: placesStat.state }]),
  ]

  const detailRows: { label: string; value: string }[] = [
    { label: 'Date', value: dateLabel },
    { label: 'Horaire', value: endTimeLabel ? `${timeLabel} — ${endTimeLabel}` : timeLabel },
    {
      label: 'Lieu',
      value: event.location_details ? `${locLabel} · ${event.location_details}` : locLabel,
    },
    ...(totalCapacity !== null
      ? [
          {
            label: 'Places totales',
            value: `${totalCapacity} place${totalCapacity > 1 ? 's' : ''}`,
          },
          {
            label: 'Places restantes',
            value:
              totalRemaining !== null && totalRemaining <= 0
                ? 'Complet'
                : `${totalRemaining} restante${totalRemaining !== 1 ? 's' : ''}`,
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
  let viewerRegistration: { ticketCode: string | null } | null = null
  if (user) {
    bookerEmail = user.email ?? ''
    const bookerEntity = await getEntityByUserId(supabase, user.id)
    bookerName = bookerEntity?.display_name ?? user.email?.split('@')[0] ?? ''

    if (bookerEmail) {
      try {
        const admin = createServiceClient()
        const existing = await getConfirmedEventRegistrationByEmail(admin, event.id, bookerEmail)
        if (existing) {
          viewerRegistration = { ticketCode: existing.ticket_code ?? null }
        }
      } catch {
        viewerRegistration = null
      }
    }
  }

  const contactInfo = await getEntityContactInfo(supabase, entity.id).catch(() => null)
  const messageEnabled = contactInfo?.message_enabled === true

  const registrationTarget = resolveDefaultEventRegistration(
    hasActivities,
    activities.map((a) => ({
      id: a.id,
      statusAvailable: a.statusAvailable,
      ticketTypes: a.ticketTypes.map((t) => ({ id: t.id, priceCents: t.priceCents })),
    })),
    ticketTypes.map((t) => ({ id: t.id, priceCents: t.priceCents }))
  )

  return {
    entity: {
      id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
      banner_url: entityRow.banner_url ?? null,
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
    ticketTypes,
    activities,
    hasActivities,
    registrationFields,
    cancellationPolicyLabel,
    isAuthenticated: !!user,
    bookerName,
    bookerEmail,
    viewerRegistration,
    messageEnabled,
    messageHref: `/${entity.slug}/message`,
    registrationTarget,
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
