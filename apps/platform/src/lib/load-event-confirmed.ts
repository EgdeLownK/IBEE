import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { eventLocationLabel, formatDetailPrice } from '@/lib/detail-format'
import { formatEventSlot } from '@/lib/billetterie-registration-view'
import {
  getEntityBySlug,
  getEventBySlug,
  getRegistrationByOrderStripeSession,
} from '@ibee/supabase'

export type EventConfirmedData = {
  entity: {
    slug: string
    display_name: string
    avatar_url: string | null
  }
  event: {
    title: string
    slug: string
    start_at: string
    end_at: string | null
  }
  registration: {
    attendeeName: string
    ticketCode: string
    ticketTypeTitle: string | null
    priceText: string
  }
  slotLabel: string
  locationLabel: string
  ticketHref: string
  eventHref: string
  profileHref: string
}

export async function loadEventConfirmed(
  slug: string,
  eventSlug: string,
  sessionId: string | null
): Promise<EventConfirmedData | null> {
  if (!sessionId) return null

  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const event = await getEventBySlug(supabase, entity.id, eventSlug)
  if (!event) return null

  const admin = createServiceClient()
  const registration = await getRegistrationByOrderStripeSession(admin, sessionId)
  if (!registration || registration.event_id !== event.id) return null

  const ticketType = registration.event_ticket_types as
    | { title: string; price_cents: number; currency: string }
    | null
    | undefined

  const priceCents = registration.price_cents ?? ticketType?.price_cents ?? null

  const ticketCode = registration.ticket_code ?? ''
  const ticketHref = `/${slug}/events/${eventSlug}/billet?code=${encodeURIComponent(ticketCode)}`

  const locBase = eventLocationLabel(event.location_type)
  const locationLabel = event.location_details
    ? `${locBase} · ${event.location_details}`
    : locBase

  return {
    entity: {
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
    },
    event: {
      title: event.title,
      slug: event.slug,
      start_at: event.start_at,
      end_at: event.end_at,
    },
    registration: {
      attendeeName: registration.attendee_name,
      ticketCode,
      ticketTypeTitle: ticketType?.title ?? null,
      priceText: formatDetailPrice(priceCents, event.currency),
    },
    slotLabel: formatEventSlot(event.start_at, event.end_at),
    locationLabel,
    ticketHref,
    eventHref: `/${slug}/events/${event.slug}`,
    profileHref: `/${slug}`,
  }
}
