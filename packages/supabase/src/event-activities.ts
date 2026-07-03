import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>

export type EventActivity = {
  id: string
  event_id: string
  entity_id: string
  title: string
  slug: string
  description: string | null
  start_at: string
  end_at: string | null
  location_type: 'online' | 'in_person' | null
  location_details: string | null
  capacity: number | null
  position: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export function isEventActivityPast(activity: Pick<EventActivity, 'start_at' | 'end_at'>): boolean {
  const now = Date.now()
  if (activity.end_at) return new Date(activity.end_at).getTime() < now
  return new Date(activity.start_at).getTime() < now
}

export async function listActivitiesByEvent(
  client: Client,
  eventId: string,
  opts: { publishedOnly?: boolean } = {}
): Promise<EventActivity[]> {
  let query = client
    .from('event_activities')
    .select('*')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
    .order('start_at', { ascending: true })

  if (opts.publishedOnly) {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as EventActivity[]
}

export async function listActivitiesByEntity(
  client: Client,
  entityId: string
): Promise<EventActivity[]> {
  const { data, error } = await client
    .from('event_activities')
    .select('*')
    .eq('entity_id', entityId)
    .order('start_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as EventActivity[]
}

export async function getActivityById(client: Client, id: string): Promise<EventActivity | null> {
  const { data, error } = await client
    .from('event_activities')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as EventActivity | null
}

export async function createEventActivity(
  client: Client,
  input: {
    eventId: string
    entityId: string
    title: string
    slug: string
    startAt: string
    endAt?: string | null
    description?: string | null
    locationType?: 'online' | 'in_person' | null
    locationDetails?: string | null
    capacity?: number | null
    position?: number
    isPublished?: boolean
  }
): Promise<EventActivity> {
  const { data, error } = await client
    .from('event_activities')
    .insert({
      event_id: input.eventId,
      entity_id: input.entityId,
      title: input.title,
      slug: input.slug,
      start_at: input.startAt,
      end_at: input.endAt ?? null,
      description: input.description ?? null,
      location_type: input.locationType ?? null,
      location_details: input.locationDetails ?? null,
      capacity: input.capacity ?? null,
      position: input.position ?? 0,
      is_published: input.isPublished ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as EventActivity
}

export async function updateEventActivity(
  client: Client,
  id: string,
  patch: Partial<{
    title: string
    slug: string
    description: string | null
    start_at: string
    end_at: string | null
    location_type: 'online' | 'in_person' | null
    location_details: string | null
    capacity: number | null
    position: number
    is_published: boolean
  }>
): Promise<EventActivity> {
  const { data, error } = await client
    .from('event_activities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EventActivity
}

export async function deleteEventActivity(client: Client, id: string): Promise<void> {
  const { error } = await client.from('event_activities').delete().eq('id', id)
  if (error) throw error
}

export async function countEventActivityHolds(client: Client, activityId: string): Promise<number> {
  const { data, error } = await client.rpc('count_event_activity_holds', {
    p_activity_id: activityId,
  })

  if (error) throw error
  return Number(data ?? 0)
}
