/** Validation payloads analytics — ingestion /api/analytics/track */

export const ANALYTICS_EVENT_TYPES = [
  'profile_view',
  'section_view',
  'publication_view',
  'product_view',
  'service_view',
  'event_view',
  'booking_created',
  'follow',
  'unfollow',
  'wishlist_add',
  'publication_share',
] as const

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]

export const ANALYTICS_SECTION_TYPES = [
  'home',
  'news',
  'events',
  'videos',
  'shop',
  'links',
  'appointments',
  'history',
  'faq',
] as const

export type AnalyticsSectionType = (typeof ANALYTICS_SECTION_TYPES)[number]

export type TrackEventPayload = {
  entity_id: string
  event_type: AnalyticsEventType
  visitor_key?: string | null
  section_type?: AnalyticsSectionType | null
  resource_id?: string | null
  metadata?: Record<string, unknown>
}

export type TrackEventsBody = {
  events: TrackEventPayload[]
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isAnalyticsEventType(value: string): value is AnalyticsEventType {
  return (ANALYTICS_EVENT_TYPES as readonly string[]).includes(value)
}

export function isAnalyticsSectionType(value: string): value is AnalyticsSectionType {
  return (ANALYTICS_SECTION_TYPES as readonly string[]).includes(value)
}

export function validateTrackEventPayload(input: unknown): {
  ok: boolean
  event?: TrackEventPayload
  error?: string
} {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Payload invalide.' }
  }

  const row = input as Record<string, unknown>
  const entityId = row.entity_id
  const eventType = row.event_type

  if (typeof entityId !== 'string' || !UUID_RE.test(entityId)) {
    return { ok: false, error: 'entity_id invalide.' }
  }
  if (typeof eventType !== 'string' || !isAnalyticsEventType(eventType)) {
    return { ok: false, error: 'event_type invalide.' }
  }

  const visitorKey = row.visitor_key
  if (visitorKey != null && (typeof visitorKey !== 'string' || visitorKey.length > 64)) {
    return { ok: false, error: 'visitor_key invalide.' }
  }

  const sectionType = row.section_type
  if (sectionType != null) {
    if (typeof sectionType !== 'string' || !isAnalyticsSectionType(sectionType)) {
      return { ok: false, error: 'section_type invalide.' }
    }
  }

  const resourceId = row.resource_id
  if (resourceId != null && (typeof resourceId !== 'string' || !UUID_RE.test(resourceId))) {
    return { ok: false, error: 'resource_id invalide.' }
  }

  let metadata: Record<string, unknown> = {}
  if (row.metadata != null) {
    if (typeof row.metadata !== 'object' || Array.isArray(row.metadata)) {
      return { ok: false, error: 'metadata invalide.' }
    }
    metadata = row.metadata as Record<string, unknown>
    if (JSON.stringify(metadata).length > 2000) {
      return { ok: false, error: 'metadata trop volumineux.' }
    }
  }

  return {
    ok: true,
    event: {
      entity_id: entityId,
      event_type: eventType,
      visitor_key: typeof visitorKey === 'string' ? visitorKey : null,
      section_type:
        typeof sectionType === 'string' ? (sectionType as AnalyticsSectionType) : null,
      resource_id: typeof resourceId === 'string' ? resourceId : null,
      metadata,
    },
  }
}

export function validateTrackEventsBody(input: unknown): {
  ok: boolean
  events?: TrackEventPayload[]
  error?: string
} {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Corps de requête invalide.' }
  }
  const body = input as Record<string, unknown>
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return { ok: false, error: 'Au moins un événement requis.' }
  }
  if (body.events.length > 10) {
    return { ok: false, error: 'Maximum 10 événements par requête.' }
  }

  const events: TrackEventPayload[] = []
  for (const item of body.events) {
    const result = validateTrackEventPayload(item)
    if (!result.ok || !result.event) {
      return { ok: false, error: result.error ?? 'Événement invalide.' }
    }
    events.push(result.event)
  }

  return { ok: true, events }
}
