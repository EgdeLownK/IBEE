import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeDelta,
  countDistinctVisitors,
  countEvents,
  groupCountByResource,
  groupCountBySection,
  listAnalyticsEvents,
} from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import { countFollowsInWindow } from '@ibee/supabase'
import type { AnalyseBarPoint, AnalysePeriod, PeriodWindow } from '@/lib/analyse-period'
import { formatPeriodRangeLabel, getPeriodWindow } from '@/lib/analyse-period'
import { bucketDistinctVisitors, bucketTimestamps } from '@/lib/analyse-buckets'
import {
  formatMetricNumber,
  formatMetricPercent,
  formatRankingPercent,
  formatUnavailableMetric,
} from '@/lib/analyse-format'

export type AnalyseScope = 'web' | 'service' | 'shop' | 'event' | 'news'

export type AnalyseKpi = {
  id: string
  k: string
  v: string
  d: string
  up: boolean
  chartWeight?: number
}

export type AnalyseRankingItem = {
  id: string
  k: string
  v: string
  n: string
  chartWeight?: number
}

export type AnalyseScopePayload = {
  scope: AnalyseScope
  period: AnalysePeriod
  offset: number
  rangeLabel: string
  metric: string
  kpis: AnalyseKpi[]
  stats?: { l: string; v: string }[]
  ranking: {
    title: string
    items: AnalyseRankingItem[]
    hasMore: boolean
  }
  chartSeries: Record<string, AnalyseBarPoint[]>
}

type Client = SupabaseClient<Database>

const SECTION_LABELS: Record<string, string> = {
  home: 'Accueil',
  news: 'News',
  events: 'Event',
  videos: 'Vidéo',
  shop: 'Shop',
  links: 'Liens',
  appointments: 'Service',
  history: 'Histoire',
  faq: 'FAQ',
}

function windowIso(window: PeriodWindow) {
  return {
    from: window.start.toISOString(),
    to: window.end.toISOString(),
  }
}

function makeKpi(
  id: string,
  label: string,
  current: number,
  previous: number,
  chartWeight?: number,
  format: (n: number) => string = formatMetricNumber
): AnalyseKpi {
  const delta = computeDelta(current, previous)
  return {
    id,
    k: label,
    v: format(current),
    d: delta.deltaLabel,
    up: delta.up,
    chartWeight,
  }
}

function buildRanking(
  entries: { id: string; label: string; count: number }[],
  total: number,
  limit: number
): { items: AnalyseRankingItem[]; hasMore: boolean } {
  const sorted = [...entries].sort((a, b) => b.count - a.count)
  const slice = sorted.slice(0, limit)
  const max = sorted[0]?.count ?? 1
  return {
    items: slice.map((entry) => ({
      id: entry.id,
      k: entry.label,
      v: formatRankingPercent(entry.count, total),
      n: formatMetricNumber(entry.count),
      chartWeight: max > 0 ? entry.count / max : 0,
    })),
    hasMore: sorted.length > limit,
  }
}

type BookingStatus = Database['public']['Enums']['booking_status']

async function countBookingsInWindow(
  client: Client,
  entityId: string,
  from: string,
  to: string,
  status?: BookingStatus
) {
  let query = client
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entityId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (status) query = query.eq('status', status)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function listBookingsInWindow(client: Client, entityId: string, from: string, to: string) {
  const { data, error } = await client
    .from('bookings')
    .select('id, created_at, status, appointment_type_id, appointment_types(title)')
    .eq('entity_id', entityId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw error
  return data ?? []
}

async function countRegistrationsInWindow(
  client: Client,
  entityId: string,
  from: string,
  to: string,
  status?: 'confirmed' | 'cancelled'
) {
  let query = client
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entityId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (status) query = query.eq('status', status)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function listRegistrationsInWindow(client: Client, entityId: string, from: string, to: string) {
  const { data, error } = await client
    .from('event_registrations')
    .select('id, created_at, status, event_id, events(title, capacity)')
    .eq('entity_id', entityId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw error
  return data ?? []
}

async function countPublicationCommentsInWindow(
  client: Client,
  entityId: string,
  from: string,
  to: string
) {
  const { data: pubs, error: pubError } = await client
    .from('publications')
    .select('id')
    .eq('entity_id', entityId)

  if (pubError) throw pubError
  const pubIds = (pubs ?? []).map((p) => p.id)
  if (pubIds.length === 0) return 0

  const { count, error } = await client
    .from('publication_comments')
    .select('*', { count: 'exact', head: true })
    .in('publication_id', pubIds)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw error
  return count ?? 0
}

async function loadWebScope(
  client: Client,
  entityId: string,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): Promise<AnalyseScopePayload> {
  const current = getPeriodWindow(period, offset)
  const previous = getPeriodWindow(period, offset - 1)
  const cur = windowIso(current)
  const prev = windowIso(previous)

  const [profileViewsCur, profileViewsPrev, sectionViewsCur, unfollowCur, unfollowPrev] =
    await Promise.all([
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['profile_view'],
        from: cur.from,
        to: cur.to,
      }),
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['profile_view'],
        from: prev.from,
        to: prev.to,
      }),
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['section_view'],
        from: cur.from,
        to: cur.to,
      }),
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['unfollow'],
        from: cur.from,
        to: cur.to,
      }),
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['unfollow'],
        from: prev.from,
        to: prev.to,
      }),
    ])

  const [membersCur, membersPrev, followRowsCur] = await Promise.all([
    countFollowsInWindow(client, entityId, cur.from, cur.to),
    countFollowsInWindow(client, entityId, prev.from, prev.to),
    client
      .from('follows')
      .select('created_at')
      .eq('followed_entity_id', entityId)
      .gte('created_at', cur.from)
      .lte('created_at', cur.to),
  ])

  const visitorsCur = countDistinctVisitors(profileViewsCur)
  const visitorsPrev = countDistinctVisitors(profileViewsPrev)

  const sectionCounts = groupCountBySection(sectionViewsCur)
  const sectionTotal = Array.from(sectionCounts.values()).reduce((a, b) => a + b, 0)
  const sectionEntries = Array.from(sectionCounts.entries()).map(([id, count]) => ({
    id: `section-${id}`,
    label: SECTION_LABELS[id] ?? id,
    count,
  }))
  const ranking = buildRanking(sectionEntries, sectionTotal, rankingLimit)

  const kpis = [
    makeKpi('visitors', 'Visiteurs', visitorsCur, visitorsPrev, 1),
    makeKpi('members', 'Membres', membersCur, membersPrev, 0.32),
    makeKpi('unsubscribed', 'Désabonnés', countEvents(unfollowCur), countEvents(unfollowPrev), 0.1),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:visitors': bucketDistinctVisitors(profileViewsCur, period, current),
    'kpi:members': bucketTimestamps(
      (followRowsCur.data ?? []).map((row) => row.created_at),
      period,
      current
    ),
    'kpi:unsubscribed': bucketTimestamps(
      unfollowCur.map((e) => e.occurred_at),
      period,
      current
    ),
  }

  for (const item of ranking.items) {
    const sectionKey = item.id.replace('section-', '')
    const events = sectionViewsCur.filter((e) => e.section_type === sectionKey)
    chartSeries[`ranking:${item.id}`] = bucketTimestamps(
      events.map((e) => e.occurred_at),
      period,
      current
    )
  }

  return {
    scope: 'web',
    period,
    offset,
    rangeLabel: formatPeriodRangeLabel(period, current),
    metric: 'Visiteurs',
    kpis,
    ranking: { title: 'Sections les plus vues', ...ranking },
    chartSeries,
  }
}

async function loadServiceScope(
  client: Client,
  entityId: string,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): Promise<AnalyseScopePayload> {
  const current = getPeriodWindow(period, offset)
  const previous = getPeriodWindow(period, offset - 1)
  const cur = windowIso(current)
  const prev = windowIso(previous)

  const [bookingsCur, bookingsPrev, noShowCur, noShowPrev, serviceViewsCur, serviceViewsPrev] =
    await Promise.all([
      countBookingsInWindow(client, entityId, cur.from, cur.to),
      countBookingsInWindow(client, entityId, prev.from, prev.to),
      countBookingsInWindow(client, entityId, cur.from, cur.to, 'no_show'),
      countBookingsInWindow(client, entityId, prev.from, prev.to, 'no_show'),
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['service_view'],
        from: cur.from,
        to: cur.to,
      }),
      listAnalyticsEvents(client, entityId, {
        eventTypes: ['service_view'],
        from: prev.from,
        to: prev.to,
      }),
    ])

  const completedCur = await countBookingsInWindow(client, entityId, cur.from, cur.to, 'completed')
  const completedPrev = await countBookingsInWindow(client, entityId, prev.from, prev.to, 'completed')

  const viewsCur = countDistinctVisitors(serviceViewsCur)
  const viewsPrev = countDistinctVisitors(serviceViewsPrev)
  const conversionCur = viewsCur > 0 ? (completedCur / viewsCur) * 100 : 0
  const conversionPrev = viewsPrev > 0 ? (completedPrev / viewsPrev) * 100 : 0

  const bookingRows = await listBookingsInWindow(client, entityId, cur.from, cur.to)
  const byType = new Map<string, { id: string; label: string; count: number }>()
  for (const row of bookingRows) {
    const typeId = row.appointment_type_id
    const title =
      (row.appointment_types as { title?: string } | null)?.title ?? 'Service'
    const existing = byType.get(typeId)
    if (existing) existing.count += 1
    else byType.set(typeId, { id: typeId, label: title, count: 1 })
  }
  const ranking = buildRanking(Array.from(byType.values()), bookingsCur, rankingLimit)

  const kpis = [
    makeKpi('bookings', 'Réservations', bookingsCur, bookingsPrev, 1),
    makeKpi('conversion', 'Taux conversion', conversionCur, conversionPrev, 0.28, (n) =>
      formatMetricPercent(n)
    ),
    makeKpi('no-show', 'No-show', noShowCur, noShowPrev, 0.12),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:bookings': bucketTimestamps(
      bookingRows.map((b) => b.created_at),
      period,
      current
    ),
    'kpi:conversion': bucketTimestamps(
      bookingRows.filter((b) => b.status === 'completed').map((b) => b.created_at),
      period,
      current
    ),
    'kpi:no-show': bucketTimestamps(
      bookingRows.filter((b) => b.status === 'no_show').map((b) => b.created_at),
      period,
      current
    ),
  }

  for (const item of ranking.items) {
    chartSeries[`ranking:${item.id}`] = bucketTimestamps(
      bookingRows.filter((b) => b.appointment_type_id === item.id).map((b) => b.created_at),
      period,
      current
    )
  }

  const cancelled = bookingRows.filter((b) => b.status === 'cancelled').length

  return {
    scope: 'service',
    period,
    offset,
    rangeLabel: formatPeriodRangeLabel(period, current),
    metric: 'Réservations',
    kpis,
    stats: [
      {
        l: 'Taux de remplissage du planning',
        v: viewsCur > 0 ? formatMetricPercent((completedCur / viewsCur) * 100) : '—',
      },
      { l: "Nombre d'annulation", v: formatMetricNumber(cancelled) },
      { l: 'Nombre de rendez-vous effectué', v: formatMetricNumber(completedCur) },
    ],
    ranking: { title: 'Top services', ...ranking },
    chartSeries,
  }
}

async function loadShopScope(
  client: Client,
  entityId: string,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): Promise<AnalyseScopePayload> {
  const current = getPeriodWindow(period, offset)
  const previous = getPeriodWindow(period, offset - 1)
  const cur = windowIso(current)
  const prev = windowIso(previous)

  const [productViewsCur, productViewsPrev, wishlistCur, wishlistPrev] = await Promise.all([
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['product_view'],
      from: cur.from,
      to: cur.to,
    }),
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['product_view'],
      from: prev.from,
      to: prev.to,
    }),
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['wishlist_add'],
      from: cur.from,
      to: cur.to,
    }),
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['wishlist_add'],
      from: prev.from,
      to: prev.to,
    }),
  ])

  const viewsCur = countEvents(productViewsCur)
  const viewsPrev = countEvents(productViewsPrev)
  const wishlistCountCur = countEvents(wishlistCur)
  const wishlistCountPrev = countEvents(wishlistPrev)

  const resourceCounts = groupCountByResource(productViewsCur)
  const { data: products } = await client
    .from('products')
    .select('id, title')
    .eq('entity_id', entityId)

  const productMap = new Map((products ?? []).map((p) => [p.id, p.title]))
  const entries = Array.from(resourceCounts.entries()).map(([id, count]) => ({
    id,
    label: productMap.get(id) ?? 'Produit',
    count,
  }))
  const ranking = buildRanking(entries, viewsCur, rankingLimit)

  const kpis: AnalyseKpi[] = [
    {
      id: 'revenue',
      k: 'Revenu',
      v: formatUnavailableMetric(),
      d: '—',
      up: true,
      chartWeight: 1,
    },
    {
      id: 'basket',
      k: 'Panier moyen',
      v: formatUnavailableMetric(),
      d: '—',
      up: true,
      chartWeight: 0.25,
    },
    makeKpi('abandoned', 'Paniers abandon.', wishlistCountCur, wishlistCountPrev, 0.15),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:abandoned': bucketTimestamps(
      wishlistCur.map((e) => e.occurred_at),
      period,
      current
    ),
    'kpi:revenue': bucketTimestamps([], period, current),
    'kpi:basket': bucketTimestamps([], period, current),
  }

  for (const item of ranking.items) {
    chartSeries[`ranking:${item.id}`] = bucketTimestamps(
      productViewsCur.filter((e) => e.resource_id === item.id).map((e) => e.occurred_at),
      period,
      current
    )
  }

  return {
    scope: 'shop',
    period,
    offset,
    rangeLabel: formatPeriodRangeLabel(period, current),
    metric: 'Ventes',
    kpis,
    stats: [
      { l: 'Unités vendus', v: formatUnavailableMetric() },
      { l: 'Panier moyen', v: formatUnavailableMetric() },
      {
        l: 'Vues produits',
        v: formatMetricNumber(viewsCur),
      },
    ],
    ranking: { title: 'Top produits', ...ranking },
    chartSeries,
  }
}

async function loadEventScope(
  client: Client,
  entityId: string,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): Promise<AnalyseScopePayload> {
  const current = getPeriodWindow(period, offset)
  const previous = getPeriodWindow(period, offset - 1)
  const cur = windowIso(current)
  const prev = windowIso(previous)

  const [signupsCur, signupsPrev, cancelledCur, cancelledPrev] = await Promise.all([
    countRegistrationsInWindow(client, entityId, cur.from, cur.to, 'confirmed'),
    countRegistrationsInWindow(client, entityId, prev.from, prev.to, 'confirmed'),
    countRegistrationsInWindow(client, entityId, cur.from, cur.to, 'cancelled'),
    countRegistrationsInWindow(client, entityId, prev.from, prev.to, 'cancelled'),
  ])

  const rows = await listRegistrationsInWindow(client, entityId, cur.from, cur.to)
  const confirmedRows = rows.filter((r) => r.status === 'confirmed')

  let capacityTotal = 0
  const byEvent = new Map<string, { id: string; label: string; count: number }>()
  for (const row of confirmedRows) {
    const eventId = row.event_id
    const event = row.events as { title?: string; capacity?: number | null } | null
    if (event?.capacity) capacityTotal += event.capacity
    const title = event?.title ?? 'Événement'
    const existing = byEvent.get(eventId)
    if (existing) existing.count += 1
    else byEvent.set(eventId, { id: eventId, label: title, count: 1 })
  }

  const fillRateCur = capacityTotal > 0 ? (signupsCur / capacityTotal) * 100 : 0
  const fillRatePrev =
    capacityTotal > 0 ? (signupsPrev / capacityTotal) * 100 : 0

  const ranking = buildRanking(Array.from(byEvent.values()), signupsCur, rankingLimit)

  const kpis = [
    makeKpi('signups', 'Inscriptions', signupsCur, signupsPrev, 1),
    makeKpi('fill-rate', 'Taux remplissage', fillRateCur, fillRatePrev, 0.3, (n) =>
      formatMetricPercent(n)
    ),
    makeKpi('cancellations', 'Annulations', cancelledCur, cancelledPrev, 0.14),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:signups': bucketTimestamps(
      confirmedRows.map((r) => r.created_at),
      period,
      current
    ),
    'kpi:fill-rate': bucketTimestamps(
      confirmedRows.map((r) => r.created_at),
      period,
      current
    ),
    'kpi:cancellations': bucketTimestamps(
      rows.filter((r) => r.status === 'cancelled').map((r) => r.created_at),
      period,
      current
    ),
  }

  for (const item of ranking.items) {
    chartSeries[`ranking:${item.id}`] = bucketTimestamps(
      confirmedRows.filter((r) => r.event_id === item.id).map((r) => r.created_at),
      period,
      current
    )
  }

  return {
    scope: 'event',
    period,
    offset,
    rangeLabel: formatPeriodRangeLabel(period, current),
    metric: 'Inscriptions',
    kpis,
    stats: [
      { l: 'Billets vendus', v: formatMetricNumber(signupsCur) },
      { l: 'Taux de remplissage', v: formatMetricPercent(fillRateCur) },
      {
        l: 'Vitesse de vente moyenne',
        v:
          period === 'week' && signupsCur > 0
            ? `${Math.round(signupsCur / 7)} / jour`
            : '—',
      },
    ],
    ranking: { title: 'Top événements', ...ranking },
    chartSeries,
  }
}

async function loadNewsScope(
  client: Client,
  entityId: string,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): Promise<AnalyseScopePayload> {
  const current = getPeriodWindow(period, offset)
  const previous = getPeriodWindow(period, offset - 1)
  const cur = windowIso(current)
  const prev = windowIso(previous)

  const [pubViewsCur, pubViewsPrev, sharesCur, sharesPrev] = await Promise.all([
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['publication_view'],
      from: cur.from,
      to: cur.to,
    }),
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['publication_view'],
      from: prev.from,
      to: prev.to,
    }),
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['publication_share'],
      from: cur.from,
      to: cur.to,
    }),
    listAnalyticsEvents(client, entityId, {
      eventTypes: ['publication_share'],
      from: prev.from,
      to: prev.to,
    }),
  ])

  const [likesCur, likesPrev] = await Promise.all([
    countPublicationCommentsInWindow(client, entityId, cur.from, cur.to),
    countPublicationCommentsInWindow(client, entityId, prev.from, prev.to),
  ])

  const viewsCur = countEvents(pubViewsCur)
  const viewsPrev = countEvents(pubViewsPrev)
  const sharesCountCur = countEvents(sharesCur)
  const sharesCountPrev = countEvents(sharesPrev)

  const resourceCounts = groupCountByResource(pubViewsCur)
  const { data: publications } = await client
    .from('publications')
    .select('id, title')
    .eq('entity_id', entityId)

  const pubMap = new Map((publications ?? []).map((p) => [p.id, p.title]))
  const entries = Array.from(resourceCounts.entries()).map(([id, count]) => ({
    id,
    label: pubMap.get(id) ?? 'Publication',
    count,
  }))
  const ranking = buildRanking(entries, viewsCur, rankingLimit)

  const kpis = [
    makeKpi('views', 'Vues', viewsCur, viewsPrev, 1),
    makeKpi('likes', 'Likes', likesCur, likesPrev, 0.35),
    makeKpi('shares', 'Partages', sharesCountCur, sharesCountPrev, 0.22),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:views': bucketTimestamps(
      pubViewsCur.map((e) => e.occurred_at),
      period,
      current
    ),
    'kpi:likes': bucketTimestamps([], period, current),
    'kpi:shares': bucketTimestamps(
      sharesCur.map((e) => e.occurred_at),
      period,
      current
    ),
  }

  for (const item of ranking.items) {
    chartSeries[`ranking:${item.id}`] = bucketTimestamps(
      pubViewsCur.filter((e) => e.resource_id === item.id).map((e) => e.occurred_at),
      period,
      current
    )
  }

  return {
    scope: 'news',
    period,
    offset,
    rangeLabel: formatPeriodRangeLabel(period, current),
    metric: 'Vues',
    kpis,
    ranking: { title: 'Top publications', ...ranking },
    chartSeries,
  }
}

export async function loadAnalyseScopeData(
  client: Client,
  entityId: string,
  opts: {
    scope: AnalyseScope
    period: AnalysePeriod
    offset: number
    rankingLimit?: number
  }
): Promise<AnalyseScopePayload> {
  const rankingLimit = opts.rankingLimit ?? 4

  switch (opts.scope) {
    case 'web':
      return loadWebScope(client, entityId, opts.period, opts.offset, rankingLimit)
    case 'service':
      return loadServiceScope(client, entityId, opts.period, opts.offset, rankingLimit)
    case 'shop':
      return loadShopScope(client, entityId, opts.period, opts.offset, rankingLimit)
    case 'event':
      return loadEventScope(client, entityId, opts.period, opts.offset, rankingLimit)
    case 'news':
      return loadNewsScope(client, entityId, opts.period, opts.offset, rankingLimit)
    default:
      return loadWebScope(client, entityId, opts.period, opts.offset, rankingLimit)
  }
}

export function parseAnalyseScope(value: string | undefined): AnalyseScope {
  if (value === 'service' || value === 'shop' || value === 'event' || value === 'news') return value
  return 'web'
}

export function parseAnalysePeriod(value: string | undefined): AnalysePeriod {
  if (value === 'month' || value === 'year') return value
  return 'week'
}

export function parseAnalyseOffset(value: string | undefined): number {
  const n = Number(value ?? '0')
  return Number.isFinite(n) ? Math.trunc(n) : 0
}
