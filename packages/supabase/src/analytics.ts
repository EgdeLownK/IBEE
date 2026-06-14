import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>
type AnalyticsEventType = Database['public']['Enums']['analytics_event_type']
type AnalyticsRow = Database['public']['Tables']['entity_analytics_events']['Row']
type MenuSectionType = Database['public']['Enums']['menu_section_type']

export type TrackEventInput = {
  entity_id: string
  event_type: AnalyticsEventType
  visitor_key?: string | null
  section_type?: MenuSectionType | null
  resource_id?: string | null
  metadata?: Record<string, unknown>
}

export type AnalyticsEventRow = AnalyticsRow

export async function trackEvent(client: Client, payload: TrackEventInput) {
  const { error } = await client.from('entity_analytics_events').insert({
    entity_id: payload.entity_id,
    event_type: payload.event_type,
    visitor_key: payload.visitor_key ?? null,
    section_type: payload.section_type ?? null,
    resource_id: payload.resource_id ?? null,
    metadata: (payload.metadata ?? {}) as Database['public']['Tables']['entity_analytics_events']['Insert']['metadata'],
  })
  if (error) throw error
}

export async function trackEvents(client: Client, payloads: TrackEventInput[]) {
  if (payloads.length === 0) return
  const rows = payloads.map((payload) => ({
    entity_id: payload.entity_id,
    event_type: payload.event_type,
    visitor_key: payload.visitor_key ?? null,
    section_type: payload.section_type ?? null,
    resource_id: payload.resource_id ?? null,
    metadata: (payload.metadata ?? {}) as Database['public']['Tables']['entity_analytics_events']['Insert']['metadata'],
  }))
  const { error } = await client.from('entity_analytics_events').insert(rows)
  if (error) throw error
}

export async function listAnalyticsEvents(
  client: Client,
  entityId: string,
  opts: {
    eventTypes?: AnalyticsEventType[]
    from: string
    to: string
    resourceId?: string
  }
) {
  let query = client
    .from('entity_analytics_events')
    .select('id, entity_id, event_type, occurred_at, visitor_key, section_type, resource_id, metadata')
    .eq('entity_id', entityId)
    .gte('occurred_at', opts.from)
    .lte('occurred_at', opts.to)
    .order('occurred_at', { ascending: true })

  if (opts.eventTypes?.length) {
    query = query.in('event_type', opts.eventTypes)
  }
  if (opts.resourceId) {
    query = query.eq('resource_id', opts.resourceId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AnalyticsEventRow[]
}

export function countDistinctVisitors(events: AnalyticsEventRow[]) {
  const keys = new Set<string>()
  for (const event of events) {
    if (event.visitor_key) keys.add(event.visitor_key)
    else keys.add(event.id)
  }
  return keys.size
}

export function countEvents(events: AnalyticsEventRow[]) {
  return events.length
}

export function groupCountByResource(events: AnalyticsEventRow[]) {
  const map = new Map<string, number>()
  for (const event of events) {
    if (!event.resource_id) continue
    map.set(event.resource_id, (map.get(event.resource_id) ?? 0) + 1)
  }
  return map
}

export function groupCountBySection(events: AnalyticsEventRow[]) {
  const map = new Map<string, number>()
  for (const event of events) {
    if (!event.section_type) continue
    map.set(event.section_type, (map.get(event.section_type) ?? 0) + 1)
  }
  return map
}

export function computeDelta(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { deltaLabel: '0 %', up: true, deltaPct: 0 }
    return { deltaLabel: '+100 %', up: true, deltaPct: 100 }
  }
  const deltaPct = Math.round(((current - previous) / previous) * 100)
  const up = deltaPct >= 0
  const sign = deltaPct > 0 ? '+' : ''
  return { deltaLabel: `${sign}${deltaPct} %`, up, deltaPct }
}
