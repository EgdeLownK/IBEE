import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type EventContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt?: string }

export type EventFaqItem = { question: string; answer: string }

export type EventRecord = {
  id: string
  entity_id: string
  title: string
  slug: string
  description: string | null
  start_at: string
  end_at: string | null
  location_type: 'online' | 'in_person'
  location_details: string | null
  price_cents: number | null
  currency: string
  capacity: number | null
  is_published: boolean
  highlights: string[]
  gallery_images: string[]
  content_blocks: EventContentBlock[]
  faq: EventFaqItem[]
  position: number
  created_at: string
  updated_at: string
  cancel_min_hours?: number
  registration_fields?: unknown
}

// ---------------------------------------------------------------------------
// Lecture publique
// ---------------------------------------------------------------------------

/**
 * Events publiés à venir d'une entity (start_at >= maintenant), du plus
 * proche au plus lointain. Les events passés ne sont pas affichés (décision
 * Killian 2026-06-06).
 */
export async function listUpcomingEvents(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { limit?: number } = {}
) {
  const { limit = 24 } = opts
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_published', true)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as EventRecord[]
}

/**
 * Events à venir pour l'owner (publiés + brouillons). Requiert client authentifié
 * (RLS events_owner_select). Les events passés restent exclus.
 */
export async function listUpcomingEventsForOwner(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { limit?: number } = {}
) {
  const { limit = 24 } = opts
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entity_id', entityId)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as EventRecord[]
}

/** Event par slug (clé métier). Renvoie aussi les non publiés — gate côté page. */
export async function getEventBySlug(
  client: SupabaseClient<Database>,
  entityId: string,
  slug: string
) {
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entity_id', entityId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as EventRecord | null
}

export async function getEventById(
  client: SupabaseClient<Database>,
  eventId: string
) {
  const { data, error } = await client.from('events').select('*').eq('id', eventId).maybeSingle()
  if (error) throw error
  return data as EventRecord | null
}

export async function deleteEvent(client: SupabaseClient<Database>, eventId: string): Promise<void> {
  const { error } = await client.from('events').delete().eq('id', eventId)
  if (error) throw error
}

export async function updateEventSettings(
  client: SupabaseClient<Database>,
  eventId: string,
  patch: {
    cancel_min_hours?: number
    capacity?: number | null
    registration_fields?: Database['public']['Tables']['events']['Update']['registration_fields']
  }
) {
  const { data, error } = await client
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data as EventRecord
}

/**
 * Nombre d'inscrits confirmés — via la RPC SECURITY DEFINER (la table
 * event_registrations est owner-only en lecture).
 */
export async function countEventRegistrations(
  client: SupabaseClient<Database>,
  eventId: string
): Promise<number> {
  const { data, error } = await client.rpc('count_event_registrations', { p_event_id: eventId })
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

export async function createEvent(
  client: SupabaseClient<Database>,
  entityId: string,
  data: {
    title: string
    slug: string
    description?: string | null
    start_at: string
    end_at?: string | null
    location_type: 'online' | 'in_person'
    location_details?: string | null
    price_cents?: number | null
    currency?: string
    capacity?: number | null
    is_published?: boolean
    highlights?: string[]
    gallery_images?: string[]
    content_blocks?: EventContentBlock[]
    faq?: EventFaqItem[]
  }
) {
  const insertPayload = {
    entity_id: entityId,
    title: data.title,
    slug: data.slug,
    description: data.description ?? null,
    start_at: data.start_at,
    end_at: data.end_at ?? null,
    location_type: data.location_type,
    location_details: data.location_details ?? null,
    price_cents: data.price_cents ?? null,
    currency: data.currency ?? 'EUR',
    capacity: data.capacity ?? null,
    is_published: data.is_published ?? true,
    highlights: data.highlights ?? [],
    gallery_images: data.gallery_images ?? [],
    content_blocks: data.content_blocks ?? [],
    faq: data.faq ?? [],
  }
  const { data: result, error } = await client
    .from('events')
    .insert(insertPayload)
    .select()
    .single()

  if (error) throw error
  return result as EventRecord
}

/** Inscription à un event. La jauge est contrôlée côté API avant l'appel. */
export async function createEventRegistration(
  client: SupabaseClient<Database>,
  data: {
    event_id: string
    entity_id: string
    activity_id?: string | null
    attendee_name: string
    attendee_email: string
    attendee_phone?: string | null
    message?: string | null
    ticket_type_id?: string | null
    ticket_code?: string | null
    price_cents?: number | null
    form_answers?: Record<string, string | boolean> | null
  }
) {
  const ticketCode =
    data.ticket_code ??
    `EVT-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`

  const { data: result, error } = await client
    .from('event_registrations')
    .insert({
      event_id: data.event_id,
      entity_id: data.entity_id,
      activity_id: data.activity_id ?? null,
      attendee_name: data.attendee_name,
      attendee_email: data.attendee_email,
      attendee_phone: data.attendee_phone ?? null,
      message: data.message ?? null,
      ticket_type_id: data.ticket_type_id ?? null,
      ticket_code: ticketCode,
      price_cents: data.price_cents ?? 0,
      form_answers: data.form_answers ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return result
}

/** Liste des inscrits (owner only — RLS event_registrations_owner_select). */
export async function listEventRegistrations(
  client: SupabaseClient<Database>,
  eventId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  const { limit = 100, offset = 0 } = opts
  const { data, error } = await client
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data ?? []
}

export type EventRegistrationWithEvent = Database['public']['Tables']['event_registrations']['Row'] & {
  events: {
    id: string
    title: string
    slug: string
    start_at: string
    end_at: string | null
    capacity: number | null
    price_cents: number | null
    currency: string
    location_type: 'online' | 'in_person'
    is_published: boolean
    registration_fields: Database['public']['Tables']['events']['Row']['registration_fields']
  } | null
  event_ticket_types?: {
    title: string
    price_cents: number
    currency: string
  } | null
  event_activities?: {
    id: string
    title: string
    slug: string
    start_at: string
    end_at: string | null
  } | null
  orders?: {
    discount_cents: number
    discount_code_id: string | null
    discount_codes: { code: string } | null
  } | null
}

export async function listRegistrationsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { limit?: number } = {}
) {
  const { limit = 200 } = opts
  const { data, error } = await client
    .from('event_registrations')
    .select(
      '*, events(id, title, slug, start_at, end_at, capacity, price_cents, currency, location_type, is_published, registration_fields), event_ticket_types(title, price_cents, currency), event_activities(id, title, slug, start_at, end_at), orders(discount_cents, discount_code_id, discount_codes(code))'
    )
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as EventRegistrationWithEvent[]
}

export async function cancelEventRegistration(
  client: SupabaseClient<Database>,
  registrationId: string
) {
  const { data, error } = await client
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .eq('id', registrationId)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Inscription confirmée d’un visiteur (service role ou owner — RLS bloque le public). */
export async function getConfirmedEventRegistrationByEmail(
  client: SupabaseClient<Database>,
  eventId: string,
  email: string
) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const { data, error } = await client
    .from('event_registrations')
    .select('id, ticket_code, status')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')
    .ilike('attendee_email', normalized)
    .maybeSingle()

  if (error) throw error
  return data
}
