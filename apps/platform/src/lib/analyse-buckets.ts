import type { AnalyseBarPoint, AnalysePeriod, PeriodWindow } from './analyse-period'
import { getChartColumnCount } from './analyse-period'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
const MONTHS_SHORT_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
] as const

export function buildBucketLabels(period: AnalysePeriod, window: PeriodWindow): string[] {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(window.start)
      day.setDate(day.getDate() + i)
      return `${DAYS_FR[i]} ${day.getDate()}`
    })
  }

  if (period === 'month') {
    const daysInMonth = window.end.getDate()
    const chunkCount = getChartColumnCount(period, window)
    return Array.from({ length: chunkCount }, (_, i) => {
      const fromDay = i * 7 + 1
      const toDay = Math.min(fromDay + 6, daysInMonth)
      return fromDay === toDay ? `${fromDay}` : `${fromDay}–${toDay}`
    })
  }

  return [...MONTHS_SHORT_FR]
}

export function mergeBucketRows(
  labels: string[],
  rows: { bucket_index: number; value: number }[]
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
  window: PeriodWindow
): AnalyseBarPoint[] {
  const filtered = timestamps
    .map(parseTs)
    .filter((ts) => inWindow(ts, window))

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(window.start)
      day.setDate(day.getDate() + i)
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      const count = filtered.filter((ts) => ts >= dayStart.getTime() && ts <= dayEnd.getTime()).length
      return { label: `${DAYS_FR[i]} ${day.getDate()}`, value: count }
    })
  }

  if (period === 'month') {
    const daysInMonth = window.end.getDate()
    const chunkCount = getChartColumnCount(period, window)
    return Array.from({ length: chunkCount }, (_, i) => {
      const fromDay = i * 7 + 1
      const toDay = Math.min(fromDay + 6, daysInMonth)
      const from = new Date(window.start.getFullYear(), window.start.getMonth(), fromDay)
      const to = new Date(window.start.getFullYear(), window.start.getMonth(), toDay, 23, 59, 59, 999)
      const count = filtered.filter((ts) => ts >= from.getTime() && ts <= to.getTime()).length
      return {
        label: fromDay === toDay ? `${fromDay}` : `${fromDay}–${toDay}`,
        value: count,
      }
    })
  }

  return MONTHS_SHORT_FR.map((label, monthIndex) => {
    const from = new Date(window.start.getFullYear(), monthIndex, 1)
    const to = new Date(window.start.getFullYear(), monthIndex + 1, 0, 23, 59, 59, 999)
    const count = filtered.filter((ts) => ts >= from.getTime() && ts <= to.getTime()).length
    return { label, value: count }
  })
}

export function bucketDistinctVisitors(
  events: { occurred_at: string; visitor_key: string | null; id: string }[],
  period: AnalysePeriod,
  window: PeriodWindow
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

  if (period === 'month') {
    const daysInMonth = window.end.getDate()
    const chunkCount = getChartColumnCount(period, window)
    return Array.from({ length: chunkCount }, (_, i) => {
      const fromDay = i * 7 + 1
      const toDay = Math.min(fromDay + 6, daysInMonth)
      const from = new Date(window.start.getFullYear(), window.start.getMonth(), fromDay)
      const to = new Date(window.start.getFullYear(), window.start.getMonth(), toDay, 23, 59, 59, 999)
      const keys = new Set<string>()
      for (const event of events) {
        const ts = parseTs(event.occurred_at)
        if (ts < from.getTime() || ts > to.getTime()) continue
        keys.add(event.visitor_key ?? event.id)
      }
      return {
        label: fromDay === toDay ? `${fromDay}` : `${fromDay}–${toDay}`,
        value: keys.size,
      }
    })
  }

  return MONTHS_SHORT_FR.map((label, monthIndex) => {
    const from = new Date(window.start.getFullYear(), monthIndex, 1)
    const to = new Date(window.start.getFullYear(), monthIndex + 1, 0, 23, 59, 59, 999)
    const keys = new Set<string>()
    for (const event of events) {
      const ts = parseTs(event.occurred_at)
      if (ts < from.getTime() || ts > to.getTime()) continue
      keys.add(event.visitor_key ?? event.id)
    }
    return { label, value: keys.size }
  })
}
