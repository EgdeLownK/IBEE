import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>

export type EventTicketType = {
  id: string
  event_id: string
  entity_id: string
  activity_id: string | null
  title: string
  slug: string
  price_cents: number
  currency: string
  sales_start_at: string | null
  sales_end_at: string | null
  quota: number | null
  position: number
  is_active: boolean
}

export type CreateEventTicketCheckoutInput = {
  entityId: string
  eventId: string
  ticketTypeId: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string | null
  attendeeMessage?: string | null
  promoCode?: string | null
  formAnswers?: Record<string, string | boolean> | null
}

export function resolveEventTicketPriceCents(ticket: {
  price_cents: number
  is_active: boolean
  sales_start_at: string | null
  sales_end_at: string | null
}): number {
  if (!ticket.is_active) return 0
  const now = Date.now()
  if (ticket.sales_start_at && new Date(ticket.sales_start_at).getTime() > now) return 0
  if (ticket.sales_end_at && new Date(ticket.sales_end_at).getTime() < now) return 0
  return ticket.price_cents
}

export function isEventTicketOnSale(ticket: {
  is_active: boolean
  sales_start_at: string | null
  sales_end_at: string | null
}): boolean {
  const now = Date.now()
  if (!ticket.is_active) return false
  if (ticket.sales_start_at && new Date(ticket.sales_start_at).getTime() > now) return false
  if (ticket.sales_end_at && new Date(ticket.sales_end_at).getTime() < now) return false
  return true
}

export async function listTicketTypesByEvent(
  client: Client,
  eventId: string,
  opts: { activeOnly?: boolean; activityId?: string | null } = {}
) {
  const { activeOnly = true, activityId } = opts
  let query = client
    .from('event_ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('position', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  if (activityId !== undefined) {
    if (activityId === null) {
      query = query.is('activity_id', null)
    } else {
      query = query.eq('activity_id', activityId)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as EventTicketType[]
}

export async function getTicketTypeById(client: Client, id: string) {
  const { data, error } = await client
    .from('event_ticket_types')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as EventTicketType | null
}

export async function createEventTicketCheckout(
  client: Client,
  input: CreateEventTicketCheckoutInput
): Promise<string> {
  const { data, error } = await client.rpc('create_event_ticket_checkout', {
    p_entity_id: input.entityId,
    p_event_id: input.eventId,
    p_ticket_type_id: input.ticketTypeId,
    p_attendee_name: input.attendeeName,
    p_attendee_email: input.attendeeEmail,
    p_attendee_phone: input.attendeePhone ?? undefined,
    p_attendee_message: input.attendeeMessage ?? undefined,
    p_promo_code: input.promoCode ?? undefined,
    p_form_answers: input.formAnswers ?? undefined,
  })

  if (error) throw error
  if (!data) throw new Error('create_event_ticket_checkout returned no order id')
  return data
}

export async function completeEventTicketCheckout(
  client: Client,
  input: {
    stripeSessionId: string
    paymentIntentId?: string | null
  }
): Promise<string> {
  const { data, error } = await client.rpc('complete_event_ticket_checkout', {
    p_stripe_session_id: input.stripeSessionId,
    p_payment_intent_id: input.paymentIntentId ?? undefined,
  })

  if (error) throw error
  if (!data) throw new Error('complete_event_ticket_checkout returned no order id')
  return data
}

export async function expireStaleEventTicketCheckouts(client: Client): Promise<number> {
  const { data, error } = await client.rpc('expire_stale_event_ticket_checkouts')
  if (error) throw error
  return data ?? 0
}

export async function getRegistrationByTicketCode(client: Client, ticketCode: string) {
  const { data, error } = await client
    .from('event_registrations')
    .select(
      '*, events(id, title, slug, start_at, end_at, location_type, location_details), event_ticket_types(title, price_cents, currency)'
    )
    .eq('ticket_code', ticketCode)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function countEventTicketHolds(client: Client, eventId: string): Promise<number> {
  const { data, error } = await client.rpc('count_event_ticket_holds', {
    p_event_id: eventId,
  })
  if (error) throw error
  return data ?? 0
}

export async function getRegistrationByOrderId(client: Client, orderId: string) {
  const { data, error } = await client
    .from('event_registrations')
    .select(
      '*, events(id, title, slug, start_at, end_at, location_type, location_details), event_ticket_types(title, price_cents, currency)'
    )
    .eq('order_id', orderId)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getRegistrationByOrderStripeSession(
  client: Client,
  stripeSessionId: string
) {
  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id')
    .eq('stripe_checkout_session_id', stripeSessionId)
    .eq('order_kind', 'event_ticket')
    .maybeSingle()

  if (orderError) throw orderError
  if (!order) return null

  const { data, error } = await client
    .from('event_registrations')
    .select(
      '*, events(id, title, slug, start_at, end_at, location_type, location_details), event_ticket_types(title, price_cents, currency)'
    )
    .eq('order_id', order.id)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (error) throw error
  return data
}

export function generateEventTicketCode(): string {
  const bytes = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  return `EVT-${bytes}`
}

export async function createTicketType(
  client: Client,
  input: {
    eventId: string
    entityId: string
    activityId?: string | null
    title: string
    slug: string
    priceCents: number
    currency?: string
    salesStartAt?: string | null
    salesEndAt?: string | null
    quota?: number | null
    position?: number
  }
) {
  const { data, error } = await client
    .from('event_ticket_types')
    .insert({
      event_id: input.eventId,
      entity_id: input.entityId,
      activity_id: input.activityId ?? null,
      title: input.title,
      slug: input.slug,
      price_cents: input.priceCents,
      currency: input.currency ?? 'EUR',
      sales_start_at: input.salesStartAt ?? null,
      sales_end_at: input.salesEndAt ?? null,
      quota: input.quota ?? null,
      position: input.position ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return data as EventTicketType
}

export async function updateTicketType(
  client: Client,
  id: string,
  patch: Partial<{
    title: string
    slug: string
    price_cents: number
    sales_start_at: string | null
    sales_end_at: string | null
    quota: number | null
    position: number
    is_active: boolean
  }>
) {
  const { data, error } = await client
    .from('event_ticket_types')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EventTicketType
}

export async function deleteTicketType(client: Client, id: string) {
  const { error } = await client.from('event_ticket_types').delete().eq('id', id)
  if (error) throw error
}

export async function listEntityEventPromoCodes(client: Client, entityId: string) {
  const { data, error } = await client
    .from('discount_codes')
    .select('*, discount_code_events(event_id)')
    .eq('entity_id', entityId)
    .in('applies_to', ['all_events', 'specific_events'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function validateEventPromoCode(
  client: Client,
  input: {
    entityId: string
    eventId: string
    code: string
    subtotalCents: number
  }
): Promise<{ codeId: string; discountCents: number } | null> {
  const { data, error } = await client.rpc('resolve_event_promo_discount', {
    p_entity_id: input.entityId,
    p_event_id: input.eventId,
    p_code: input.code,
    p_subtotal_cents: input.subtotalCents,
  })

  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as
    | { code_id: string; discount_cents: number }
    | null
    | undefined
  if (!row?.code_id || !row.discount_cents) return null
  return { codeId: row.code_id, discountCents: row.discount_cents }
}

export async function listRegistrationsDueForReminder(client: Client) {
  const { data, error } = await client.rpc('list_event_registrations_due_for_reminder')
  if (error) throw error
  return data ?? []
}

export type EventCheckInResult =
  | { status: 'checked_in'; registrationId: string; checkedInAt: string; attendeeName: string; attendeeEmail: string; eventTitle: string; ticketTypeTitle: string | null }
  | { status: 'already_checked_in'; registrationId: string; checkedInAt: string; attendeeName: string; eventTitle: string; ticketTypeTitle: string | null }
  | { status: 'invalid' }
  | { status: 'cancelled'; registrationId: string }
  | { status: 'wrong_event'; registrationId: string; eventTitle: string }
  | { status: 'not_open' }

export type EventCheckInLiveStats = {
  confirmedCount: number
  checkedInCount: number
  revenueCents: number
  salesToday: number
}

export type EventEntreePublicStats = {
  confirmedCount: number
  checkedInCount: number
}

export type CheckInEventOption = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  isToday: boolean
}

function parseCheckInResult(raw: unknown): EventCheckInResult {
  const row = raw as Record<string, unknown> | null
  if (!row || typeof row.status !== 'string') return { status: 'invalid' }

  switch (row.status) {
    case 'checked_in':
      return {
        status: 'checked_in',
        registrationId: String(row.registration_id),
        checkedInAt: String(row.checked_in_at),
        attendeeName: String(row.attendee_name),
        attendeeEmail: String(row.attendee_email),
        eventTitle: String(row.event_title),
        ticketTypeTitle: row.ticket_type_title ? String(row.ticket_type_title) : null,
      }
    case 'already_checked_in':
      return {
        status: 'already_checked_in',
        registrationId: String(row.registration_id),
        checkedInAt: String(row.checked_in_at),
        attendeeName: String(row.attendee_name),
        eventTitle: String(row.event_title),
        ticketTypeTitle: row.ticket_type_title ? String(row.ticket_type_title) : null,
      }
    case 'cancelled':
      return { status: 'cancelled', registrationId: String(row.registration_id) }
    case 'wrong_event':
      return {
        status: 'wrong_event',
        registrationId: String(row.registration_id),
        eventTitle: String(row.event_title),
      }
    case 'not_open':
      return { status: 'not_open' }
    default:
      return { status: 'invalid' }
  }
}

export async function checkInEventRegistration(
  client: Client,
  input: { entityId: string; ticketCode: string; eventId?: string | null }
): Promise<EventCheckInResult> {
  const { data, error } = await client.rpc('check_in_event_registration', {
    p_entity_id: input.entityId,
    p_ticket_code: input.ticketCode.trim(),
    p_event_id: input.eventId ?? undefined,
  })

  if (error) throw error
  return parseCheckInResult(data)
}

export async function selfCheckInEventRegistration(
  client: Client,
  input: { eventId: string; ticketCode: string }
): Promise<EventCheckInResult> {
  const { data, error } = await client.rpc(
    'self_check_in_event_registration',
    {
      p_event_id: input.eventId,
      p_ticket_code: input.ticketCode.trim(),
    }
  )

  if (error) throw error
  return parseCheckInResult(data)
}

export async function getEventCheckInLiveStats(
  client: Client,
  entityId: string,
  eventId: string
): Promise<EventCheckInLiveStats> {
  const { data, error } = await client.rpc('get_event_checkin_live_stats', {
    p_entity_id: entityId,
    p_event_id: eventId,
  })

  if (error) throw error
  const row = data as Record<string, unknown> | null
  return {
    confirmedCount: Number(row?.confirmed_count ?? 0),
    checkedInCount: Number(row?.checked_in_count ?? 0),
    revenueCents: Number(row?.revenue_cents ?? 0),
    salesToday: Number(row?.sales_today ?? 0),
  }
}

export async function getEventEntreePublicStats(
  client: Client,
  eventId: string
): Promise<EventEntreePublicStats | null> {
  const { data, error } = await client.rpc('get_event_entree_public_stats', {
    p_event_id: eventId,
  })

  if (error) throw error
  if (!data) return null
  const row = data as unknown as Record<string, unknown>
  return {
    confirmedCount: Number(row.confirmed_count ?? 0),
    checkedInCount: Number(row.checked_in_count ?? 0),
  }
}

export async function listEventsForCheckIn(client: Client, entityId: string): Promise<CheckInEventOption[]> {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const horizon = new Date(startOfToday)
  horizon.setDate(horizon.getDate() + 14)

  const { data, error } = await client
    .from('events')
    .select('id, title, start_at, end_at')
    .eq('entity_id', entityId)
    .eq('is_published', true)
    .gte('start_at', startOfToday.toISOString())
    .lte('start_at', horizon.toISOString())
    .order('start_at', { ascending: true })

  if (error) throw error

  const todayKey = startOfToday.toDateString()
  return (data ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    startAt: event.start_at,
    endAt: event.end_at,
    isToday: new Date(event.start_at).toDateString() === todayKey,
  }))
}

export async function markRegistrationReminderSent(client: Client, registrationId: string) {
  const { error } = await client
    .from('event_registrations')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', registrationId)

  if (error) throw error
}
