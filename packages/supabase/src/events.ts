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
    attendee_name: string
    attendee_email: string
    attendee_phone?: string | null
    message?: string | null
  }
) {
  const { data: result, error } = await client
    .from('event_registrations')
    .insert({
      event_id: data.event_id,
      entity_id: data.entity_id,
      attendee_name: data.attendee_name,
      attendee_email: data.attendee_email,
      attendee_phone: data.attendee_phone ?? null,
      message: data.message ?? null,
      // status intentionnellement omis : défaut DB = 'confirmed'
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
