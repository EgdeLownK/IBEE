import type { EventRegistrationWithEvent } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import { parseEventRegistrationFields } from '@/lib/event-registration-fields'

export type RegistrationStatus = Database['public']['Enums']['event_registration_status']

export type BilletterieRegistrationFilter = 'all' | 'upcoming' | 'past' | 'cancelled'

export const BILLETTERIE_REGISTRATION_FILTERS: ReadonlyArray<{
  id: BilletterieRegistrationFilter
  label: string
}> = [
  { id: 'all', label: 'Tout' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'past', label: 'Passés' },
  { id: 'cancelled', label: 'Annulés' },
]

export type BilletterieRegistrationView = {
  id: string
  ref: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string | null
  message: string | null
  status: RegistrationStatus
  createdAt: string
  eventId: string
  eventTitle: string
  eventSlug: string
  eventStartAt: string
  eventEndAt: string | null
  eventCapacity: number | null
  eventPriceCents: number | null
  eventCurrency: string
  eventLocationType: 'online' | 'in_person'
  entitySlug: string
  ticketCode: string | null
  ticketTypeId: string | null
  ticketTypeTitle: string | null
  activityId: string | null
  activityTitle: string | null
  priceCents: number | null
  orderId: string | null
  promoCode: string | null
  discountCents: number | null
  refundCents: number
  formAnswers: Array<{ label: string; value: string }>
  checkedInAt: string | null
}

export type BilletterieEventSnapshot = {
  id: string
  title: string
  startAt: string
  capacity: number | null
  confirmedCount: number
  spotsLeft: number | null
}

export type BilletterieTodaySnapshot = {
  registrations7d: number
  upcomingEventsCount: number
  lowCapacityCount: number
  todayEventLive: {
    eventId: string
    eventTitle: string
    confirmedCount: number
    checkedInCount: number
    revenueCents: number
    salesToday: number
  } | null
}

export type BilletterieDashboardData = {
  registrations: BilletterieRegistrationView[]
  events: BilletterieEventSnapshot[]
  today: BilletterieTodaySnapshot
  entitySlug: string
}

const UPCOMING_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const LOW_CAPACITY_THRESHOLD = 5

function formatRegistrationFormAnswers(
  fieldsRaw: unknown,
  answersRaw: unknown
): Array<{ label: string; value: string }> {
  const fields = parseEventRegistrationFields(fieldsRaw)
  const fieldById = new Map(fields.map((field) => [field.id, field]))
  const answers =
    typeof answersRaw === 'object' && answersRaw !== null && !Array.isArray(answersRaw)
      ? (answersRaw as Record<string, unknown>)
      : {}

  return Object.entries(answers)
    .map(([id, value]) => {
      const field = fieldById.get(id)
      const label = field?.label ?? id
      const display =
        typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value ?? '').trim()
      if (!display) return null
      return { label, value: display }
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null)
}

export function formatRegistrationRef(id: string, createdAt: string): string {
  const date = new Date(createdAt)
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  return `#INS-${stamp}-${id.slice(0, 4).toUpperCase()}`
}

export function formatBilletterieRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `il y a ${diffHours} h`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function formatEventSlot(startAt: string, endAt: string | null): string {
  const start = new Date(startAt)
  const datePart = start.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const label = `${datePart.charAt(0).toUpperCase()}${datePart.slice(1)}`
  if (!endAt) return `${label} · ${timeFmt.format(start)}`
  const end = new Date(endAt)
  return `${label} · ${timeFmt.format(start)} — ${timeFmt.format(end)}`
}

export function isEventUpcoming(startAtIso: string): boolean {
  return new Date(startAtIso).getTime() >= Date.now()
}

export function isEventInNext7Days(startAtIso: string): boolean {
  const start = new Date(startAtIso).getTime()
  const now = Date.now()
  return start >= now && start <= now + UPCOMING_DAYS_MS
}

/** Premier inscrit confirmé pour cet email sur le profil (avant cette inscription). */
export function isFirstTimeParticipant(
  registration: BilletterieRegistrationView,
  allRegistrations: BilletterieRegistrationView[]
): boolean {
  if (registration.status !== 'confirmed') return false

  const email = registration.attendeeEmail.trim().toLowerCase()
  if (!email) return false

  const createdAt = new Date(registration.createdAt).getTime()
  return !allRegistrations.some(
    (other) =>
      other.id !== registration.id &&
      other.status === 'confirmed' &&
      other.attendeeEmail.trim().toLowerCase() === email &&
      new Date(other.createdAt).getTime() < createdAt
  )
}

export function mapRegistrationToView(
  row: EventRegistrationWithEvent,
  entitySlug: string
): BilletterieRegistrationView {
  const event = row.events
  const ticketType = row.event_ticket_types as
    | { title: string; price_cents: number; currency: string }
    | null
    | undefined
  const activity = row.event_activities as
    | { id: string; title: string; slug: string; start_at: string; end_at: string | null }
    | null
    | undefined

  return {
    id: row.id,
    ref: formatRegistrationRef(row.id, row.created_at),
    attendeeName: row.attendee_name.trim() || row.attendee_email,
    attendeeEmail: row.attendee_email,
    attendeePhone: row.attendee_phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    eventId: row.event_id,
    eventTitle: event?.title ?? 'Événement',
    eventSlug: event?.slug ?? '',
    eventStartAt: activity?.start_at ?? event?.start_at ?? row.created_at,
    eventEndAt: activity?.end_at ?? event?.end_at ?? null,
    eventCapacity: event?.capacity ?? null,
    eventPriceCents: event?.price_cents ?? null,
    eventCurrency: event?.currency ?? 'EUR',
    eventLocationType: event?.location_type ?? 'online',
    entitySlug,
    ticketCode: row.ticket_code ?? null,
    ticketTypeId: row.ticket_type_id ?? null,
    ticketTypeTitle: ticketType?.title ?? null,
    activityId: row.activity_id ?? activity?.id ?? null,
    activityTitle: activity?.title ?? null,
    priceCents: row.price_cents ?? ticketType?.price_cents ?? null,
    orderId: row.order_id ?? null,
    promoCode: row.orders?.discount_codes?.code ?? null,
    discountCents: row.orders?.discount_cents ?? null,
    refundCents: row.refund_cents ?? 0,
    formAnswers: formatRegistrationFormAnswers(
      event?.registration_fields,
      row.form_answers
    ),
    checkedInAt: row.checked_in_at ?? null,
  }
}

export function matchesBilletterieFilter(
  reg: BilletterieRegistrationView,
  filter: BilletterieRegistrationFilter
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'upcoming':
      return reg.status === 'confirmed' && isEventUpcoming(reg.eventStartAt)
    case 'past':
      return reg.status === 'confirmed' && !isEventUpcoming(reg.eventStartAt)
    case 'cancelled':
      return reg.status === 'cancelled'
    default:
      return true
  }
}

export function searchBilletterieRegistrations(
  registrations: BilletterieRegistrationView[],
  query: string
): BilletterieRegistrationView[] {
  const q = query.trim().toLowerCase()
  if (!q) return registrations

  return registrations.filter((reg) => {
    const haystack = [
      reg.ref,
      reg.attendeeName,
      reg.attendeeEmail,
      reg.attendeePhone ?? '',
      reg.eventTitle,
      reg.activityTitle ?? '',
      reg.message ?? '',
      reg.ticketCode ?? '',
      reg.ticketTypeTitle ?? '',
      reg.promoCode ?? '',
      ...reg.formAnswers.map((answer) => `${answer.label} ${answer.value}`),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function sortBilletterieRegistrations(
  registrations: BilletterieRegistrationView[],
  filter: BilletterieRegistrationFilter
): BilletterieRegistrationView[] {
  return [...registrations].sort((a, b) => {
    if (filter === 'upcoming' || filter === 'all') {
      return new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime()
    }
    return new Date(b.eventStartAt).getTime() - new Date(a.eventStartAt).getTime()
  })
}

export function filterBilletterieRegistrations(
  registrations: BilletterieRegistrationView[],
  filter: BilletterieRegistrationFilter,
  searchQuery = ''
): BilletterieRegistrationView[] {
  const searched = searchBilletterieRegistrations(registrations, searchQuery)
  const filtered = searched.filter((reg) => matchesBilletterieFilter(reg, filter))
  return sortBilletterieRegistrations(filtered, filter)
}

export function countBilletterieByFilter(
  registrations: BilletterieRegistrationView[],
  filter: BilletterieRegistrationFilter
): number {
  return registrations.filter((reg) => matchesBilletterieFilter(reg, filter)).length
}

export function buildBilletterieEventSnapshots(
  registrations: BilletterieRegistrationView[]
): BilletterieEventSnapshot[] {
  const byEvent = new Map<string, BilletterieEventSnapshot>()

  for (const reg of registrations) {
    if (reg.status !== 'confirmed') continue
    const existing = byEvent.get(reg.eventId)
    if (existing) {
      existing.confirmedCount += 1
      if (existing.capacity != null) {
        existing.spotsLeft = Math.max(0, existing.capacity - existing.confirmedCount)
      }
    } else {
      const capacity = reg.eventCapacity
      byEvent.set(reg.eventId, {
        id: reg.eventId,
        title: reg.eventTitle,
        startAt: reg.eventStartAt,
        capacity,
        confirmedCount: 1,
        spotsLeft: capacity != null ? Math.max(0, capacity - 1) : null,
      })
    }
  }

  return Array.from(byEvent.values()).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  )
}

export function buildBilletterieTodaySnapshot(
  registrations: BilletterieRegistrationView[],
  events: BilletterieEventSnapshot[]
): BilletterieTodaySnapshot {
  const since7d = Date.now() - UPCOMING_DAYS_MS
  const registrations7d = registrations.filter(
    (r) => r.status === 'confirmed' && new Date(r.createdAt).getTime() >= since7d
  ).length

  const upcomingEventsCount = events.filter((e) => isEventInNext7Days(e.startAt)).length

  const lowCapacityCount = events.filter(
    (e) =>
      isEventUpcoming(e.startAt) &&
      e.spotsLeft != null &&
      e.spotsLeft <= LOW_CAPACITY_THRESHOLD
  ).length

  return { registrations7d, upcomingEventsCount, lowCapacityCount, todayEventLive: null }
}

export function registrationsToCsv(rows: BilletterieRegistrationView[]): string {
  const header = [
    'Référence',
    'Nom',
    'Email',
    'Téléphone',
    'Événement',
    'Type billet',
    'Code billet',
    'Montant',
    'Code promo',
    'Remise',
    'Remboursé',
    'Réponses formulaire',
    'Date événement',
    'Statut',
    'Inscrit le',
    'Message',
  ]
  const lines = rows.map((r) =>
    [
      r.ref,
      r.attendeeName,
      r.attendeeEmail,
      r.attendeePhone ?? '',
      r.eventTitle,
      r.ticketTypeTitle ?? '',
      r.ticketCode ?? '',
      r.priceCents != null && r.priceCents > 0
        ? `${(r.priceCents / 100).toFixed(2)} ${r.eventCurrency}`
        : 'Gratuit',
      r.promoCode ?? '',
      r.discountCents != null && r.discountCents > 0
        ? `${(r.discountCents / 100).toFixed(2)} ${r.eventCurrency}`
        : '',
      r.refundCents > 0 ? `${(r.refundCents / 100).toFixed(2)} ${r.eventCurrency}` : '',
      r.formAnswers.map((answer) => `${answer.label}: ${answer.value}`).join(' · '),
      formatEventSlot(r.eventStartAt, r.eventEndAt),
      r.status === 'confirmed' ? 'Confirmé' : 'Annulé',
      new Date(r.createdAt).toLocaleString('fr-FR'),
      r.message ?? '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  )
  return [header.join(','), ...lines].join('\n')
}
