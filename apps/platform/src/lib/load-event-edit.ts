import 'server-only'

import {
  getEventById,
  listActivitiesByEvent,
  listEntityEventPromoCodes,
  listTicketTypesByEvent,
} from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { parseEventRegistrationFields } from '@/lib/event-registration-fields'

type Client = SupabaseClient<Database>

export async function loadEventEditData(client: Client, entityId: string, eventId: string) {
  const event = await getEventById(client, eventId)
  if (!event || event.entity_id !== entityId) return null

  const [activities, ticketTypes, promoCodesRaw] = await Promise.all([
    listActivitiesByEvent(client, eventId, { publishedOnly: false }),
    listTicketTypesByEvent(client, eventId, { activeOnly: false }),
    listEntityEventPromoCodes(client, entityId).catch(() => []),
  ])

  const promoCodes = promoCodesRaw.filter(
    (code) =>
      code.applies_to === 'all_events' ||
      (code.discount_code_events ?? []).some(
        (row: { event_id: string }) => row.event_id === eventId
      )
  )

  return {
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      startAt: event.start_at,
      cancelMinHours: event.cancel_min_hours ?? 24,
      registrationFields: parseEventRegistrationFields(event.registration_fields),
    },
    activities: activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      slug: activity.slug,
      startAt: activity.start_at,
      endAt: activity.end_at,
      capacity: activity.capacity,
      isPublished: activity.is_published,
    })),
    ticketTypes: ticketTypes.map((t) => ({
      id: t.id,
      activityId: t.activity_id,
      title: t.title,
      slug: t.slug,
      priceCents: t.price_cents,
      currency: t.currency,
      salesStartAt: t.sales_start_at,
      salesEndAt: t.sales_end_at,
      quota: t.quota,
      isActive: t.is_active,
    })),
    promoCodes: promoCodes.map((code) => ({
      id: code.id,
      code: code.code,
      type: code.type as 'percentage' | 'fixed_amount',
      value: Number(code.value),
      maxUsesTotal: code.max_uses_total,
      endsAt: code.ends_at,
      isActive: code.is_active,
    })),
  }
}

export type EventEditData = NonNullable<Awaited<ReturnType<typeof loadEventEditData>>>
