import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchAnalyseScopeRaw,
  fetchAnalyseRankingChartBuckets,
} from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import type { AnalyseBarPoint, AnalysePeriod, PeriodWindow } from '@/lib/analyse-period'
import { formatPeriodRangeLabel, getPeriodWindow } from '@/lib/analyse-period'
import { bucketTimestamps, buildBucketLabels, mergeBucketRows } from '@/lib/analyse-buckets'
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
type BookingStatus = Database['public']['Enums']['booking_status']

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

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function parseBucketRows(value: unknown): { bucket_index: number; value: number }[] {
  if (!Array.isArray(value)) return []
  return value.map((row) => {
    const item = row as { bucket_index?: unknown; value?: unknown }
    return {
      bucket_index: asNumber(item.bucket_index),
      value: asNumber(item.value),
    }
  })
}

function computeDelta(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { deltaLabel: '0 %', up: true, deltaPct: 0 }
    return { deltaLabel: '+100 %', up: true, deltaPct: 100 }
  }
  const deltaPct = Math.round(((current - previous) / previous) * 100)
  const up = deltaPct >= 0
  const sign = deltaPct > 0 ? '+' : ''
  return { deltaLabel: `${sign}${deltaPct} %`, up, deltaPct }
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

function countRowsWithStatus<T extends { status: string }>(
  rows: T[],
  status?: BookingStatus | 'confirmed' | 'cancelled'
) {
  if (!status) return rows.length
  return rows.filter((row) => row.status === status).length
}

async function fetchScopeRaw(
  client: Client,
  entityId: string,
  scope: AnalyseScope,
  period: AnalysePeriod,
  offset: number
) {
  const current = getPeriodWindow(period, offset)
  const previous = getPeriodWindow(period, offset - 1)
  const cur = windowIso(current)
  const prev = windowIso(previous)

  return fetchAnalyseScopeRaw(client, entityId, {
    scope,
    from: cur.from,
    to: cur.to,
    prevFrom: prev.from,
    prevTo: prev.to,
    period,
  })
}

function buildWebPayload(
  raw: Record<string, unknown>,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): AnalyseScopePayload {
  const current = getPeriodWindow(period, offset)

  const visitorsCur = asNumber(raw.visitors_cur)
  const visitorsPrev = asNumber(raw.visitors_prev)
  const membersCur = asNumber(raw.members_cur)
  const membersPrev = asNumber(raw.members_prev)
  const unsubscribedCur = asNumber(raw.unsubscribed_cur)
  const unsubscribedPrev = asNumber(raw.unsubscribed_prev)

  const sectionRows = Array.isArray(raw.section_counts) ? raw.section_counts : []
  const sectionEntries = sectionRows.map((row) => {
    const item = row as { section_type?: string; count?: unknown }
    const id = String(item.section_type ?? '')
    return {
      id: `section-${id}`,
      label: SECTION_LABELS[id] ?? id,
      count: asNumber(item.count),
    }
  })
  const sectionTotal = sectionEntries.reduce((sum, entry) => sum + entry.count, 0)
  const ranking = buildRanking(sectionEntries, sectionTotal, rankingLimit)

  const kpis = [
    makeKpi('visitors', 'Visiteurs', visitorsCur, visitorsPrev, 1),
    makeKpi('members', 'Membres', membersCur, membersPrev, 0.32),
    makeKpi('unsubscribed', 'Désabonnés', unsubscribedCur, unsubscribedPrev, 0.1),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:visitors': mergeBucketRows(
      buildBucketLabels(period, current),
      parseBucketRows(raw.visitor_buckets)
    ),
    'kpi:members': bucketTimestamps(asStringArray(raw.follow_timestamps), period, current),
    'kpi:unsubscribed': mergeBucketRows(
      buildBucketLabels(period, current),
      parseBucketRows(raw.unsubscribed_buckets)
    ),
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

type ServiceBookingRow = {
  id: string
  created_at: string
  status: string
  appointment_type_id: string
  appointment_type_title?: string | null
}

function buildServicePayload(
  raw: Record<string, unknown>,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): AnalyseScopePayload {
  const current = getPeriodWindow(period, offset)

  const bookingRows = (Array.isArray(raw.bookings_cur) ? raw.bookings_cur : []).map((row) => {
    const item = row as ServiceBookingRow
    return {
      id: String(item.id),
      created_at: String(item.created_at),
      status: String(item.status),
      appointment_type_id: String(item.appointment_type_id),
      appointment_type_title: item.appointment_type_title ?? null,
    }
  })
  const bookingRowsPrev = (Array.isArray(raw.bookings_prev) ? raw.bookings_prev : []).map((row) => ({
    status: String((row as { status?: string }).status ?? ''),
  }))

  const viewsCur = asNumber(raw.views_cur)
  const viewsPrev = asNumber(raw.views_prev)
  const bookingsCur = bookingRows.length
  const bookingsPrev = bookingRowsPrev.length
  const noShowCur = countRowsWithStatus(bookingRows, 'no_show')
  const noShowPrev = countRowsWithStatus(bookingRowsPrev, 'no_show')
  const completedCur = countRowsWithStatus(bookingRows, 'completed')
  const completedPrev = countRowsWithStatus(bookingRowsPrev, 'completed')

  const conversionCur = viewsCur > 0 ? (completedCur / viewsCur) * 100 : 0
  const conversionPrev = viewsPrev > 0 ? (completedPrev / viewsPrev) * 100 : 0

  const byType = new Map<string, { id: string; label: string; count: number }>()
  for (const row of bookingRows) {
    const typeId = row.appointment_type_id
    const title = row.appointment_type_title ?? 'Service'
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

function buildShopPayload(
  raw: Record<string, unknown>,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): AnalyseScopePayload {
  const current = getPeriodWindow(period, offset)

  const viewsCur = asNumber(raw.views_cur)
  const viewsPrev = asNumber(raw.views_prev)
  const wishlistCur = asNumber(raw.wishlist_cur)
  const wishlistPrev = asNumber(raw.wishlist_prev)

  const productMap = new Map<string, string>()
  if (raw.products && typeof raw.products === 'object' && !Array.isArray(raw.products)) {
    for (const [id, title] of Object.entries(raw.products as Record<string, unknown>)) {
      productMap.set(id, String(title))
    }
  }

  const resourceRows = Array.isArray(raw.resource_counts) ? raw.resource_counts : []
  const entries = resourceRows.map((row) => {
    const item = row as { resource_id?: string; count?: unknown }
    const id = String(item.resource_id ?? '')
    return {
      id,
      label: productMap.get(id) ?? 'Produit',
      count: asNumber(item.count),
    }
  })
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
    makeKpi('abandoned', 'Paniers abandon.', wishlistCur, wishlistPrev, 0.15),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:abandoned': mergeBucketRows(
      buildBucketLabels(period, current),
      parseBucketRows(raw.wishlist_buckets)
    ),
    'kpi:revenue': bucketTimestamps([], period, current),
    'kpi:basket': bucketTimestamps([], period, current),
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
      { l: 'Vues produits', v: formatMetricNumber(viewsCur) },
    ],
    ranking: { title: 'Top produits', ...ranking },
    chartSeries,
  }
}

type EventRegistrationRow = {
  id: string
  created_at: string
  status: string
  event_id: string
  event_title?: string | null
  event_capacity?: number | null
}

function buildEventPayload(
  raw: Record<string, unknown>,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): AnalyseScopePayload {
  const current = getPeriodWindow(period, offset)

  const rowsCur = (Array.isArray(raw.registrations_cur) ? raw.registrations_cur : []).map((row) => {
    const item = row as EventRegistrationRow
    return {
      id: String(item.id),
      created_at: String(item.created_at),
      status: String(item.status),
      event_id: String(item.event_id),
      event_title: item.event_title ?? null,
      event_capacity: item.event_capacity ?? null,
    }
  })
  const rowsPrev = (Array.isArray(raw.registrations_prev) ? raw.registrations_prev : []).map((row) => ({
    status: String((row as { status?: string }).status ?? ''),
  }))

  const confirmedRows = rowsCur.filter((r) => r.status === 'confirmed')
  const signupsCur = confirmedRows.length
  const signupsPrev = countRowsWithStatus(rowsPrev, 'confirmed')
  const cancelledCur = countRowsWithStatus(rowsCur, 'cancelled')
  const cancelledPrev = countRowsWithStatus(rowsPrev, 'cancelled')

  let capacityTotal = 0
  const byEvent = new Map<string, { id: string; label: string; count: number }>()
  for (const row of confirmedRows) {
    if (row.event_capacity) capacityTotal += row.event_capacity
    const title = row.event_title ?? 'Événement'
    const existing = byEvent.get(row.event_id)
    if (existing) existing.count += 1
    else byEvent.set(row.event_id, { id: row.event_id, label: title, count: 1 })
  }

  const fillRateCur = capacityTotal > 0 ? (signupsCur / capacityTotal) * 100 : 0
  const fillRatePrev = capacityTotal > 0 ? (signupsPrev / capacityTotal) * 100 : 0
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
      rowsCur.filter((r) => r.status === 'cancelled').map((r) => r.created_at),
      period,
      current
    ),
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
        v: period === 'week' && signupsCur > 0 ? `${Math.round(signupsCur / 7)} / jour` : '—',
      },
    ],
    ranking: { title: 'Top événements', ...ranking },
    chartSeries,
  }
}

function buildNewsPayload(
  raw: Record<string, unknown>,
  period: AnalysePeriod,
  offset: number,
  rankingLimit: number
): AnalyseScopePayload {
  const current = getPeriodWindow(period, offset)

  const viewsCur = asNumber(raw.views_cur)
  const viewsPrev = asNumber(raw.views_prev)
  const sharesCur = asNumber(raw.shares_cur)
  const sharesPrev = asNumber(raw.shares_prev)
  const likesCur = asNumber(raw.comments_cur)
  const likesPrev = asNumber(raw.comments_prev)

  const pubMap = new Map<string, string>()
  if (raw.publications && typeof raw.publications === 'object' && !Array.isArray(raw.publications)) {
    for (const [id, title] of Object.entries(raw.publications as Record<string, unknown>)) {
      pubMap.set(id, String(title))
    }
  }

  const resourceRows = Array.isArray(raw.resource_counts) ? raw.resource_counts : []
  const entries = resourceRows.map((row) => {
    const item = row as { resource_id?: string; count?: unknown }
    const id = String(item.resource_id ?? '')
    return {
      id,
      label: pubMap.get(id) ?? 'Publication',
      count: asNumber(item.count),
    }
  })
  const ranking = buildRanking(entries, viewsCur, rankingLimit)

  const kpis = [
    makeKpi('views', 'Vues', viewsCur, viewsPrev, 1),
    makeKpi('likes', 'Likes', likesCur, likesPrev, 0.35),
    makeKpi('shares', 'Partages', sharesCur, sharesPrev, 0.22),
  ]

  const chartSeries: Record<string, AnalyseBarPoint[]> = {
    'kpi:views': mergeBucketRows(
      buildBucketLabels(period, current),
      parseBucketRows(raw.views_buckets)
    ),
    'kpi:likes': bucketTimestamps([], period, current),
    'kpi:shares': mergeBucketRows(
      buildBucketLabels(period, current),
      parseBucketRows(raw.shares_buckets)
    ),
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

export async function loadAnalyseRankingChartSeries(
  client: Client,
  entityId: string,
  opts: {
    scope: AnalyseScope
    period: AnalysePeriod
    offset: number
    rankingItemId: string
  }
): Promise<AnalyseBarPoint[]> {
  const current = getPeriodWindow(opts.period, opts.offset)
  const cur = windowIso(current)

  if (opts.scope !== 'web' && opts.scope !== 'shop' && opts.scope !== 'news') {
    return bucketTimestamps([], opts.period, current)
  }

  const sectionKey =
    opts.scope === 'web'
      ? (opts.rankingItemId.replace('section-', '') as Database['public']['Enums']['menu_section_type'])
      : null

  const rows = await fetchAnalyseRankingChartBuckets(client, entityId, {
    scope: opts.scope,
    from: cur.from,
    to: cur.to,
    period: opts.period,
    sectionType: sectionKey,
    resourceId: opts.scope === 'web' ? null : opts.rankingItemId,
  })

  return mergeBucketRows(buildBucketLabels(opts.period, current), rows)
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
  const raw = await fetchScopeRaw(client, entityId, opts.scope, opts.period, opts.offset)

  switch (opts.scope) {
    case 'web':
      return buildWebPayload(raw, opts.period, opts.offset, rankingLimit)
    case 'service':
      return buildServicePayload(raw, opts.period, opts.offset, rankingLimit)
    case 'shop':
      return buildShopPayload(raw, opts.period, opts.offset, rankingLimit)
    case 'event':
      return buildEventPayload(raw, opts.period, opts.offset, rankingLimit)
    case 'news':
      return buildNewsPayload(raw, opts.period, opts.offset, rankingLimit)
    default:
      return buildWebPayload(raw, opts.period, opts.offset, rankingLimit)
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
