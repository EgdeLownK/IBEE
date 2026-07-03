import 'server-only'

import {
  listRegistrationsByEntity,
  listEventsForCheckIn,
  getEventCheckInLiveStats,
  getBannedClientsByEntity,
  listActivitiesByEntity,
} from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EventRecord, EventTicketType } from '@ibee/supabase'
import {
  buildBilletterieEventSnapshots,
  buildBilletterieTodaySnapshot,
  mapRegistrationToView,
  type BilletterieDashboardData,
  type BilletterieRegistrationView,
} from '@/lib/billetterie-registration-view'
import { buildBilletterieEventLines, type BilletterieEventLine } from '@/lib/event-catalog-view'
import { mapBannedClientToView, type BannedClientView } from '@/lib/banned-client-view'
import { EVENT_ROOT_PLACE_ID } from '@/lib/event-place-view'

type Client = SupabaseClient<Database>

export type BilletterieEventActivitySnapshot = {
  id: string
  eventId: string
  title: string
  startAt: string
  endAt: string | null
  capacity: number | null
  confirmedCount: number
  /** Place virtuelle = capacité globale de l'événement (pas de ligne event_activities). */
  isEventRoot?: boolean
}

export type LoadedBilletterieDashboard = BilletterieDashboardData & {
  eventLines: BilletterieEventLine[]
  bannedClients: BannedClientView[]
  activitiesByEventId: Record<string, BilletterieEventActivitySnapshot[]>
}

async function loadTodayEventLive(client: Client, entityId: string) {
  const events = await listEventsForCheckIn(client, entityId)
  const todayEvent = events.find((event) => event.isToday)
  if (!todayEvent) return null

  const stats = await getEventCheckInLiveStats(client, entityId, todayEvent.id)
  return {
    eventId: todayEvent.id,
    eventTitle: todayEvent.title,
    confirmedCount: stats.confirmedCount,
    checkedInCount: stats.checkedInCount,
    revenueCents: stats.revenueCents,
    salesToday: stats.salesToday,
  }
}

function isMissingRegistrationsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error ? String(error.message) : ''
  return (
    message.includes('event_registrations') &&
    (message.includes('does not exist') || message.includes('schema cache'))
  )
}

export async function loadBilletterieDashboardData(
  client: Client,
  entityId: string,
  entitySlug: string
): Promise<LoadedBilletterieDashboard> {
  try {
    const [rows, eventRows, ticketRows, bannedRows, activityRows] = await Promise.all([
      listRegistrationsByEntity(client, entityId, { limit: 300 }),
      loadOwnerEvents(client, entityId),
      loadOwnerTicketTypes(client, entityId),
      getBannedClientsByEntity(client, entityId),
      listActivitiesByEntity(client, entityId).catch(() => []),
    ])
    const registrations = rows.map((row) => mapRegistrationToView(row, entitySlug))
    const events = buildBilletterieEventSnapshots(registrations)
    const eventLines = buildBilletterieEventLines(eventRows, ticketRows, registrations)
    const today = buildBilletterieTodaySnapshot(registrations, events)
    const todayEventLive = await loadTodayEventLive(client, entityId)
    const bannedClients = bannedRows.map(mapBannedClientToView)
    const activitiesByEventId = mergeEventRootPlaces(
      eventLines,
      buildActivitiesByEventId(activityRows, registrations)
    )

    return {
      registrations,
      events,
      eventLines,
      today: { ...today, todayEventLive },
      entitySlug,
      bannedClients,
      activitiesByEventId,
    }
  } catch (error) {
    if (isMissingRegistrationsTableError(error)) {
      return {
        registrations: [],
        events: [],
        eventLines: [],
        today: { registrations7d: 0, upcomingEventsCount: 0, lowCapacityCount: 0, todayEventLive: null },
        entitySlug,
        bannedClients: [],
        activitiesByEventId: {},
      }
    }
    throw error
  }
}

async function loadOwnerEvents(client: Client, entityId: string): Promise<EventRecord[]> {
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entity_id', entityId)
    .order('start_at', { ascending: true })
    .limit(100)

  if (error) throw error
  return (data ?? []) as EventRecord[]
}

async function loadOwnerTicketTypes(client: Client, entityId: string): Promise<EventTicketType[]> {
  const { data, error } = await client
    .from('event_ticket_types')
    .select('*')
    .eq('entity_id', entityId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data ?? []) as EventTicketType[]
}

function buildActivitiesByEventId(
  activities: Awaited<ReturnType<typeof listActivitiesByEntity>>,
  registrations: BilletterieRegistrationView[]
): Record<string, BilletterieEventActivitySnapshot[]> {
  const confirmedByActivity = new Map<string, number>()
  for (const registration of registrations) {
    if (registration.status !== 'confirmed' || !registration.activityId) continue
    confirmedByActivity.set(
      registration.activityId,
      (confirmedByActivity.get(registration.activityId) ?? 0) + 1
    )
  }

  const byEvent: Record<string, BilletterieEventActivitySnapshot[]> = {}

  for (const activity of activities) {
    if (!byEvent[activity.event_id]) byEvent[activity.event_id] = []
    byEvent[activity.event_id].push({
      id: activity.id,
      eventId: activity.event_id,
      title: activity.title,
      startAt: activity.start_at,
      endAt: activity.end_at,
      capacity: activity.capacity,
      confirmedCount: confirmedByActivity.get(activity.id) ?? 0,
    })
  }

  for (const eventId of Object.keys(byEvent)) {
    byEvent[eventId].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
  }

  return byEvent
}

function mergeEventRootPlaces(
  eventLines: BilletterieEventLine[],
  activitiesByEventId: Record<string, BilletterieEventActivitySnapshot[]>
): Record<string, BilletterieEventActivitySnapshot[]> {
  const merged = { ...activitiesByEventId }

  for (const event of eventLines) {
    if ((merged[event.id]?.length ?? 0) > 0) continue

    merged[event.id] = [
      {
        id: EVENT_ROOT_PLACE_ID,
        eventId: event.id,
        title: 'Général',
        startAt: event.startAt,
        endAt: event.endAt,
        capacity: event.capacity,
        confirmedCount: event.confirmedCount,
        isEventRoot: true,
      },
    ]
  }

  return merged
}
