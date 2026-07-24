import { createServiceClient } from '@/lib/supabase/admin'
import { eventLocationLabel, formatDetailPrice } from '@/lib/detail-format'
import { formatEventSlot } from '@/lib/billetterie-registration-view'
import { getEntityBySlug, getRegistrationByTicketCode } from '@ibee/supabase'

export type EventTicketData = {
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
    attendeeEmail: string
    ticketCode: string
    ticketTypeTitle: string | null
    priceText: string
    status: string
  }
  slotLabel: string
  locationLabel: string
  eventHref: string
  profileHref: string
}

export async function loadEventTicket(
  slug: string,
  eventSlug: string,
  ticketCode: string | null,
): Promise<EventTicketData | null> {
  if (!ticketCode?.trim()) return null

  const supabase = createServiceClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const registration = await getRegistrationByTicketCode(supabase, ticketCode.trim())
  if (!registration) return null

  const event = registration.events as {
    id: string
    title: string
    slug: string
    start_at: string
    end_at: string | null
    location_type: 'online' | 'in_person'
    location_details: string | null
  } | null

  if (!event || event.slug !== eventSlug || registration.entity_id !== entity.id) return null

  const ticketType = registration.event_ticket_types as
    { title: string; price_cents: number; currency: string } | null | undefined

  const priceCents = registration.price_cents ?? ticketType?.price_cents ?? null

  const locBase = eventLocationLabel(event.location_type)
  const locationLabel = event.location_details ? `${locBase} · ${event.location_details}` : locBase

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
      attendeeEmail: registration.attendee_email,
      ticketCode: registration.ticket_code ?? ticketCode.trim(),
      ticketTypeTitle: ticketType?.title ?? null,
      priceText: formatDetailPrice(priceCents, ticketType?.currency ?? 'EUR'),
      status: registration.status,
    },
    slotLabel: formatEventSlot(event.start_at, event.end_at),
    locationLabel,
    eventHref: `/${slug}/events/${event.slug}`,
    profileHref: `/${slug}`,
  }
}
