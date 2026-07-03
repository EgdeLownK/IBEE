import { getTicketTypeById } from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { eventLocationLabel } from '@/lib/detail-format'
import { sendEventRegistrationConfirmationEmail } from '@/lib/event-registration-email'
import { buildEventCancelUrl } from '@/lib/event-cancel-token'
import { createServiceClient } from '@/lib/supabase/admin'

type RegistrationNotifyInput = {
  id: string
  entity_id: string
  event_id: string
  attendee_name: string
  attendee_email: string
  ticket_type_id: string | null
  ticket_code: string | null
  price_cents: number | null
}

async function getEntityDisplayName(
  supabase: SupabaseClient<Database>,
  entityId: string
): Promise<{ name: string; slug: string }> {
  const { data } = await supabase
    .from('entity')
    .select('display_name, slug')
    .eq('id', entityId)
    .maybeSingle()

  return { name: data?.display_name ?? 'Organisateur', slug: data?.slug ?? '' }
}

export async function notifyEventRegistrationCreated(
  registration: RegistrationNotifyInput,
  opts: { supabase?: SupabaseClient<Database> } = {}
) {
  if (!registration.ticket_code) return

  const supabase = opts.supabase ?? createServiceClient()

  try {
    const { data: event } = await supabase
      .from('events')
      .select('title, slug, start_at, end_at, location_type, location_details, currency, cancel_min_hours')
      .eq('id', registration.event_id)
      .maybeSingle()

    if (!event) return

    const [entity, ticketType] = await Promise.all([
      getEntityDisplayName(supabase, registration.entity_id),
      registration.ticket_type_id
        ? getTicketTypeById(supabase, registration.ticket_type_id)
        : Promise.resolve(null),
    ])

    const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
    const ticketUrl = `${siteUrl}/${entity.slug}/events/${event.slug}/billet?code=${encodeURIComponent(registration.ticket_code)}`
    const cancelUrl = buildEventCancelUrl(
      registration.id,
      event.start_at,
      event.cancel_min_hours ?? 24
    )

    const locBase = eventLocationLabel(event.location_type)
    const locationLabel = event.location_details
      ? `${locBase} · ${event.location_details}`
      : locBase

    await sendEventRegistrationConfirmationEmail({
      attendeeName: registration.attendee_name,
      attendeeEmail: registration.attendee_email,
      eventTitle: event.title,
      eventStartAt: event.start_at,
      eventEndAt: event.end_at,
      locationLabel,
      entityName: entity.name,
      ticketTypeTitle: ticketType?.title ?? null,
      ticketCode: registration.ticket_code,
      ticketUrl,
      cancelUrl,
      priceCents: registration.price_cents,
      currency: event.currency ?? 'EUR',
    })
  } catch (error) {
    console.error('[notifyEventRegistrationCreated]', error)
  }
}
