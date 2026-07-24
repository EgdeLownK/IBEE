import type { EventRecord } from '@ibee/supabase'
import { isEventTicketOnSale } from '@ibee/supabase'
import type { EventTicketType } from '@ibee/supabase'
import {
  formatEventSlot,
  isEventUpcoming,
  type BilletterieRegistrationView,
} from '@/lib/billetterie-registration-view'
import { formatBoutiqueMoney } from '@/lib/boutique-order-view'

export type BilletterieTicketTypeLine = {
  id: string
  title: string
  priceCents: number
  currency: string
  quota: number | null
  soldCount: number
  isOnSale: boolean
}

export type BilletterieEventLine = {
  id: string
  title: string
  slug: string
  startAt: string
  endAt: string | null
  locationType: 'online' | 'in_person'
  locationLabel: string
  imageUrl: string | null
  capacity: number | null
  isPublished: boolean
  confirmedCount: number
  checkedInCount: number
  revenueCents: number
  spotsLeft: number | null
  isToday: boolean
  isUpcoming: boolean
  ticketTypes: BilletterieTicketTypeLine[]
  hasCustomForm: boolean
  slotLabel: string
}

const LOCATION_LABELS = {
  online: 'En ligne',
  in_person: 'Sur place',
} as const

function isEventToday(startAtIso: string): boolean {
  const start = new Date(startAtIso)
  const today = new Date()
  return start.toDateString() === today.toDateString()
}

function hasCustomRegistrationFields(fields: unknown): boolean {
  return Array.isArray(fields) && fields.length > 0
}

export function buildBilletterieEventLines(
  events: EventRecord[],
  ticketTypes: EventTicketType[],
  registrations: BilletterieRegistrationView[],
): BilletterieEventLine[] {
  const ticketsByEvent = new Map<string, EventTicketType[]>()
  for (const ticket of ticketTypes) {
    const list = ticketsByEvent.get(ticket.event_id) ?? []
    list.push(ticket)
    ticketsByEvent.set(ticket.event_id, list)
  }

  const statsByEvent = new Map<
    string,
    { confirmed: number; checkedIn: number; revenue: number; byTicket: Map<string, number> }
  >()

  for (const reg of registrations) {
    if (reg.status !== 'confirmed') continue
    const stats = statsByEvent.get(reg.eventId) ?? {
      confirmed: 0,
      checkedIn: 0,
      revenue: 0,
      byTicket: new Map<string, number>(),
    }
    stats.confirmed += 1
    if (reg.checkedInAt) stats.checkedIn += 1
    stats.revenue += reg.priceCents ?? 0
    if (reg.ticketTypeId) {
      stats.byTicket.set(reg.ticketTypeId, (stats.byTicket.get(reg.ticketTypeId) ?? 0) + 1)
    }
    statsByEvent.set(reg.eventId, stats)
  }

  return events
    .map((event) => {
      const stats = statsByEvent.get(event.id) ?? {
        confirmed: 0,
        checkedIn: 0,
        revenue: 0,
        byTicket: new Map<string, number>(),
      }
      const capacity = event.capacity
      const eventTickets = ticketsByEvent.get(event.id) ?? []
      const gallery = Array.isArray(event.gallery_images) ? event.gallery_images : []
      const imageUrl =
        typeof gallery[0] === 'string' && gallery[0].trim() ? gallery[0].trim() : null

      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        startAt: event.start_at,
        endAt: event.end_at,
        locationType: event.location_type,
        locationLabel: LOCATION_LABELS[event.location_type],
        imageUrl,
        capacity,
        isPublished: event.is_published,
        confirmedCount: stats.confirmed,
        checkedInCount: stats.checkedIn,
        revenueCents: stats.revenue,
        spotsLeft: capacity != null ? Math.max(0, capacity - stats.confirmed) : null,
        isToday: isEventToday(event.start_at),
        isUpcoming: isEventUpcoming(event.start_at),
        ticketTypes: eventTickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          priceCents: ticket.price_cents,
          currency: ticket.currency,
          quota: ticket.quota,
          soldCount: stats.byTicket.get(ticket.id) ?? 0,
          isOnSale: isEventTicketOnSale(ticket),
        })),
        hasCustomForm: hasCustomRegistrationFields(event.registration_fields),
        slotLabel: formatEventSlot(event.start_at, event.end_at),
      }
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
}

export function formatEventRevenue(cents: number, currency = 'EUR'): string {
  if (cents <= 0) return 'Gratuit'
  return formatBoutiqueMoney(cents, currency)
}

export function filterRegistrationsByEvent(
  registrations: BilletterieRegistrationView[],
  eventId: string | null,
): BilletterieRegistrationView[] {
  if (!eventId) return registrations
  return registrations.filter((reg) => reg.eventId === eventId)
}

export function searchEventLines(
  events: BilletterieEventLine[],
  query: string,
): BilletterieEventLine[] {
  const q = query.trim().toLowerCase()
  if (!q) return events

  return events.filter((event) => {
    const haystack = [event.title, event.locationLabel, event.slotLabel, event.slug]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function getEventCapacityState(event: BilletterieEventLine): {
  hasCapacity: boolean
  isSoldOut: boolean
  isLowCapacity: boolean
  fillRatio: number | null
} {
  if (event.capacity == null) {
    return { hasCapacity: false, isSoldOut: false, isLowCapacity: false, fillRatio: null }
  }

  const fillRatio = Math.min(1, event.confirmedCount / event.capacity)
  const spotsLeft = event.spotsLeft ?? Math.max(0, event.capacity - event.confirmedCount)

  return {
    hasCapacity: true,
    isSoldOut: spotsLeft <= 0,
    isLowCapacity: spotsLeft > 0 && spotsLeft <= 5,
    fillRatio,
  }
}

export function formatEventCapacityLabel(event: BilletterieEventLine): string {
  if (event.capacity == null) {
    return `${event.confirmedCount} inscrit${event.confirmedCount > 1 ? 's' : ''}`
  }

  return `${event.confirmedCount}/${event.capacity} place${event.capacity > 1 ? 's' : ''}`
}

export function formatEventCardDate(startAt: string): { day: string; month: string } {
  const start = new Date(startAt)
  return {
    day: start.toLocaleDateString('fr-FR', { day: 'numeric' }),
    month: start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
  }
}

export function formatEventCardTime(startAt: string, endAt: string | null): string {
  const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const start = new Date(startAt)
  if (!endAt) return timeFmt.format(start)
  return `${timeFmt.format(start)} — ${timeFmt.format(new Date(endAt))}`
}

/** « Aujourd'hui » ou « J-X » (jours calendaires avant l'événement). Null si passé. */
export function formatEventCountdownLabel(startAt: string): string | null {
  const start = new Date(startAt)
  const now = new Date()
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays > 0) return `J-${diffDays}`
  return null
}

export type EventFeedSegment = 'upcoming' | 'past'

const EVENT_FEED_SEGMENT_ORDER: Record<EventFeedSegment, number> = {
  upcoming: 0,
  past: 1,
}

export const EVENT_FEED_SECTION_LABELS: Record<EventFeedSegment, string> = {
  upcoming: 'À venir',
  past: 'Passée',
}

/** Terminé : fin dépassée, ou début dépassé si pas de fin. */
export function isEventPast(startAt: string, endAt: string | null): boolean {
  const now = Date.now()
  if (endAt) return new Date(endAt).getTime() < now
  return new Date(startAt).getTime() < now
}

export function getEventFeedSegment(
  event: Pick<BilletterieEventLine, 'startAt' | 'endAt'>,
): EventFeedSegment {
  return isEventPast(event.startAt, event.endAt) ? 'past' : 'upcoming'
}

export type EventUpcomingSubsegment = 'today' | 'future'

export const EVENT_UPCOMING_SUBSECTION_LABELS: Record<EventUpcomingSubsegment, string> = {
  today: "Aujourd'hui",
  future: 'À venir',
}

const UPCOMING_SUBSEGMENT_ORDER: Record<EventUpcomingSubsegment, number> = {
  today: 0,
  future: 1,
}

function startOfCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isEventStartToday(startAt: string): boolean {
  const start = new Date(startAt)
  const now = new Date()
  return startOfCalendarDay(start).getTime() === startOfCalendarDay(now).getTime()
}

/** Sous-groupe dans l'onglet À venir : aujourd'hui (ou en cours) puis jours futurs. */
export function getEventUpcomingSubsegment(
  event: Pick<BilletterieEventLine, 'startAt' | 'endAt'>,
): EventUpcomingSubsegment {
  const now = Date.now()
  const started = new Date(event.startAt).getTime() < now
  const inProgress = started && !isEventPast(event.startAt, event.endAt)

  if (isEventStartToday(event.startAt) || inProgress) return 'today'
  return 'future'
}

function eventPastSortTime(event: BilletterieEventLine): number {
  return new Date(event.endAt ?? event.startAt).getTime()
}

/** À venir (y compris en cours) puis passés ; proche en haut, lointain en bas. */
export function sortEventLinesForFeed(events: BilletterieEventLine[]): BilletterieEventLine[] {
  return [...events].sort((a, b) => {
    const segA = getEventFeedSegment(a)
    const segB = getEventFeedSegment(b)
    const segmentOrder = EVENT_FEED_SEGMENT_ORDER[segA] - EVENT_FEED_SEGMENT_ORDER[segB]
    if (segmentOrder !== 0) return segmentOrder

    if (segA === 'past') {
      return eventPastSortTime(b) - eventPastSortTime(a)
    }

    const subA = getEventUpcomingSubsegment(a)
    const subB = getEventUpcomingSubsegment(b)
    const subOrder = UPCOMING_SUBSEGMENT_ORDER[subA] - UPCOMING_SUBSEGMENT_ORDER[subB]
    if (subOrder !== 0) return subOrder

    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  })
}
