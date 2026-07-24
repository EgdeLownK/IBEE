import type { AnalyseBarPoint, AnalysePeriod, PeriodWindow } from './analyse-period'
import { monthIndexFromDate, yearBucketLabels } from './analyse-period'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

export function buildBucketLabels(period: AnalysePeriod, window: PeriodWindow): string[] {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(window.start)
      day.setDate(day.getDate() + i)
      return `${DAYS_FR[i]} ${day.getDate()}`
    })
  }

  return yearBucketLabels()
}

export function mergeBucketRows(
  labels: string[],
  rows: { bucket_index: number; value: number }[],
  _period: AnalysePeriod,
): AnalyseBarPoint[] {
  const map = new Map(rows.map((row) => [row.bucket_index, row.value]))
  return labels.map((label, index) => ({
    label,
    value: map.get(index) ?? 0,
  }))
}

function parseTs(value: string) {
  return new Date(value).getTime()
}

function inWindow(ts: number, window: PeriodWindow) {
  return ts >= window.start.getTime() && ts <= window.end.getTime()
}

export function bucketTimestamps(
  timestamps: string[],
  period: AnalysePeriod,
  window: PeriodWindow,
): AnalyseBarPoint[] {
  const filtered = timestamps.map(parseTs).filter((ts) => inWindow(ts, window))

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(window.start)
      day.setDate(day.getDate() + i)
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      const count = filtered.filter(
        (ts) => ts >= dayStart.getTime() && ts <= dayEnd.getTime(),
      ).length
      return { label: `${DAYS_FR[i]} ${day.getDate()}`, value: count }
    })
  }

  const totals = Array.from({ length: 12 }, () => 0)
  for (const ts of filtered) {
    totals[monthIndexFromDate(new Date(ts))] += 1
  }

  return yearBucketLabels().map((label, index) => ({
    label,
    value: totals[index] ?? 0,
  }))
}

export function bucketDistinctVisitors(
  events: { occurred_at: string; visitor_key: string | null; id: string }[],
  period: AnalysePeriod,
  window: PeriodWindow,
) {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(window.start)
      day.setDate(day.getDate() + i)
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      const keys = new Set<string>()
      for (const event of events) {
        const ts = parseTs(event.occurred_at)
        if (ts < dayStart.getTime() || ts > dayEnd.getTime()) continue
        keys.add(event.visitor_key ?? event.id)
      }
      return { label: `${DAYS_FR[i]} ${day.getDate()}`, value: keys.size }
    })
  }

  const keysByMonth: Array<Set<string>> = Array.from({ length: 12 }, () => new Set())
  for (const event of events) {
    const ts = parseTs(event.occurred_at)
    if (!inWindow(ts, window)) continue
    const month = monthIndexFromDate(new Date(ts))
    keysByMonth[month].add(event.visitor_key ?? event.id)
  }

  return yearBucketLabels().map((label, index) => ({
    label,
    value: keysByMonth[index]?.size ?? 0,
  }))
}
