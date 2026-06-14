export type AnalysePeriod = 'week' | 'month' | 'year'

export type AnalyseBarPoint = {
  label: string
  value: number
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const
const MONTHS_SHORT_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const

export type PeriodWindow = {
  start: Date
  end: Date
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getPeriodWindow(period: AnalysePeriod, offset: number, now = new Date()): PeriodWindow {
  if (period === 'week') {
    const start = startOfWeekMonday(now)
    start.setDate(start.getDate() + offset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  if (period === 'month') {
    const anchor = startOfMonth(now)
    anchor.setMonth(anchor.getMonth() + offset)
    return { start: anchor, end: endOfMonth(anchor) }
  }

  const start = startOfYear(now)
  start.setFullYear(start.getFullYear() + offset)
  const end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { start, end }
}

export function getMinPeriodOffset(
  period: AnalysePeriod,
  accountCreatedAt: string,
  now = new Date()
): number {
  const created = new Date(accountCreatedAt)

  if (period === 'week') {
    const createdWeek = startOfWeekMonday(created).getTime()
    const currentWeek = startOfWeekMonday(now).getTime()
    const weeks = Math.floor((currentWeek - createdWeek) / (7 * 24 * 60 * 60 * 1000))
    return -Math.max(0, weeks)
  }

  if (period === 'month') {
    const months =
      (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
    return -Math.max(0, months)
  }

  const years = now.getFullYear() - created.getFullYear()
  return -Math.max(0, years)
}

function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]}`
}

export function formatPeriodRangeLabel(period: AnalysePeriod, window: PeriodWindow): string {
  const { start, end } = window

  if (period === 'week') {
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${end.getFullYear()}`
    }
    return `${formatDayMonth(start)} ${start.getFullYear()} – ${formatDayMonth(end)} ${end.getFullYear()}`
  }

  if (period === 'month') {
    return `${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`
  }

  return String(start.getFullYear())
}

function hashSeed(parts: (string | number)[]): number {
  const raw = parts.join('|')
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0
  }
  return h
}

export function buildChartBars(
  scope: string,
  seriesKey: string,
  period: AnalysePeriod,
  offset: number,
  window: PeriodWindow,
  baseValues: number[],
  chartWeight = 1
): AnalyseBarPoint[] {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(window.start)
      day.setDate(day.getDate() + i)
      const seed = hashSeed([scope, seriesKey, period, offset, i])
      const base = baseValues[i % baseValues.length] ?? 50
      const value = Math.max(
        0,
        Math.round(base * chartWeight * (0.55 + (seed % 90) / 100))
      )
      return { label: `${DAYS_FR[i]} ${day.getDate()}`, value }
    })
  }

  if (period === 'month') {
    const daysInMonth = window.end.getDate()
    const chunkCount = Math.min(5, Math.ceil(daysInMonth / 7))
    return Array.from({ length: chunkCount }, (_, i) => {
      const fromDay = i * 7 + 1
      const toDay = Math.min(fromDay + 6, daysInMonth)
      const seed = hashSeed([scope, seriesKey, period, offset, i])
      const base = baseValues[i % baseValues.length] ?? 50
      const value = Math.max(
        0,
        Math.round(base * chartWeight * (0.6 + (seed % 80) / 100))
      )
      return {
        label: fromDay === toDay ? `${fromDay}` : `${fromDay}–${toDay}`,
        value,
      }
    })
  }

  return MONTHS_SHORT_FR.map((label, i) => {
    const seed = hashSeed([scope, seriesKey, period, offset, i])
    const base = baseValues[i % baseValues.length] ?? 50
    const value = Math.max(
      0,
      Math.round(base * chartWeight * (0.5 + (seed % 100) / 100))
    )
    return { label, value }
  })
}

export function getChartColumnCount(period: AnalysePeriod, window: PeriodWindow): number {
  if (period === 'week') return 7
  if (period === 'month') return Math.min(5, Math.ceil(window.end.getDate() / 7))
  return 12
}
