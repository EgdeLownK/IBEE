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

type AnalyticsWindowFilter = {
  eventTypes: AnalyticsEventType[]
  from: string
  to: string
  sectionType?: MenuSectionType | null
  resourceId?: string | null
}

export async function countEventsInWindow(
  client: Client,
  entityId: string,
  opts: AnalyticsWindowFilter
): Promise<number> {
  const { data, error } = await client.rpc('count_analytics_events', {
    p_entity_id: entityId,
    p_event_types: opts.eventTypes,
    p_from: opts.from,
    p_to: opts.to,
    p_section_type: opts.sectionType ?? undefined,
    p_resource_id: opts.resourceId ?? undefined,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function countDistinctVisitorsInWindow(
  client: Client,
  entityId: string,
  opts: AnalyticsWindowFilter
): Promise<number> {
  const { data, error } = await client.rpc('count_analytics_distinct_visitors', {
    p_entity_id: entityId,
    p_event_types: opts.eventTypes,
    p_from: opts.from,
    p_to: opts.to,
    p_section_type: opts.sectionType ?? undefined,
    p_resource_id: opts.resourceId ?? undefined,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function groupCountBySectionInWindow(
  client: Client,
  entityId: string,
  opts: Pick<AnalyticsWindowFilter, 'eventTypes' | 'from' | 'to'>
) {
  const { data, error } = await client.rpc('group_analytics_by_section', {
    p_entity_id: entityId,
    p_event_types: opts.eventTypes,
    p_from: opts.from,
    p_to: opts.to,
  })
  if (error) throw error
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    if (row.section_type) map.set(row.section_type, Number(row.event_count))
  }
  return map
}

export async function groupCountByResourceInWindow(
  client: Client,
  entityId: string,
  opts: Pick<AnalyticsWindowFilter, 'eventTypes' | 'from' | 'to'>
) {
  const { data, error } = await client.rpc('group_analytics_by_resource', {
    p_entity_id: entityId,
    p_event_types: opts.eventTypes,
    p_from: opts.from,
    p_to: opts.to,
  })
  if (error) throw error
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    if (row.resource_id) map.set(row.resource_id, Number(row.event_count))
  }
  return map
}

export type AnalyticsBucketPeriod = 'week' | 'month' | 'year'

export type AnalyseScopeRpc = 'web' | 'service' | 'shop' | 'event' | 'news'

export type AnalyseBucketRow = { bucket_index: number; value: number }

/** Payload RPC `get_analyse_web_data` — buckets agrégés côté SQL (pas de timestamps bruts). */
export type AnalyseWebScopeRaw = {
  visitors_cur: number
  visitors_prev: number
  members_cur: number
  members_prev: number
  unsubscribed_cur: number
  unsubscribed_prev: number
  section_counts: { section_type: string; count: number }[]
  visitor_buckets: AnalyseBucketRow[]
  unsubscribed_buckets: AnalyseBucketRow[]
  member_buckets: AnalyseBucketRow[]
}

export async function fetchAnalyseScopeRaw(
  client: Client,
  entityId: string,
  opts: {
    scope: AnalyseScopeRpc
    from: string
    to: string
    prevFrom: string
    prevTo: string
    period: AnalyticsBucketPeriod
  }
): Promise<Record<string, unknown>> {
  const { data, error } = await client.rpc('get_analyse_scope_data', {
    p_entity_id: entityId,
    p_scope: opts.scope,
    p_from: opts.from,
    p_to: opts.to,
    p_prev_from: opts.prevFrom,
    p_prev_to: opts.prevTo,
    p_period: opts.period,
  })
  if (error) throw error
  return (data ?? {}) as Record<string, unknown>
}

export async function fetchAnalyseRankingChartBuckets(
  client: Client,
  entityId: string,
  opts: {
    scope: 'web' | 'shop' | 'news'
    from: string
    to: string
    period: AnalyticsBucketPeriod
    sectionType?: MenuSectionType | null
    resourceId?: string | null
  }
): Promise<AnalyseBucketRow[]> {
  const { data, error } = await client.rpc('get_analyse_ranking_chart_buckets', {
    p_entity_id: entityId,
    p_scope: opts.scope,
    p_from: opts.from,
    p_to: opts.to,
    p_period: opts.period,
    p_section_type: opts.sectionType ?? undefined,
    p_resource_id: opts.resourceId ?? undefined,
  })
  if (error) throw error
  const rows = (data ?? []) as { bucket_index: number; value: number }[]
  return rows.map((row) => ({
    bucket_index: Number(row.bucket_index),
    value: Number(row.value),
  }))
}

export async function bucketEventsInWindow(
  client: Client,
  entityId: string,
  opts: AnalyticsWindowFilter & { period: AnalyticsBucketPeriod }
) {
  const { data, error } = await client.rpc('bucket_analytics_events', {
    p_entity_id: entityId,
    p_event_types: opts.eventTypes,
    p_from: opts.from,
    p_to: opts.to,
    p_period: opts.period,
    p_section_type: opts.sectionType ?? undefined,
    p_resource_id: opts.resourceId ?? undefined,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    bucket_index: Number(row.bucket_index),
    value: Number(row.event_count),
  }))
}

export async function bucketDistinctVisitorsInWindow(
  client: Client,
  entityId: string,
  opts: AnalyticsWindowFilter & { period: AnalyticsBucketPeriod }
) {
  const { data, error } = await client.rpc('bucket_analytics_distinct_visitors', {
    p_entity_id: entityId,
    p_event_types: opts.eventTypes,
    p_from: opts.from,
    p_to: opts.to,
    p_period: opts.period,
    p_section_type: opts.sectionType ?? undefined,
    p_resource_id: opts.resourceId ?? undefined,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    bucket_index: Number(row.bucket_index),
    value: Number(row.event_count),
  }))
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
