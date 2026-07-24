export type AnalysePeriod = 'week' | 'year'

export const ANALYSE_PERIOD_TABS: ReadonlyArray<{ id: AnalysePeriod; label: string }> = [
  { id: 'week', label: 'Semaine' },
  { id: 'year', label: 'Année' },
]

/** Normalise toute valeur legacy (`month`, etc.) vers une période supportée. */
export function normalizeAnalysePeriod(value: string | undefined | null): AnalysePeriod {
  return value === 'year' ? 'year' : 'week'
}

export type AnalyseBarPoint = {
  label: string
  value: number
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
const YEAR_MONTH_LABELS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
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

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

function formatDayNumeric(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export function getPeriodWindow(
  period: AnalysePeriod,
  offset: number,
  now = new Date(),
): PeriodWindow {
  if (period === 'week') {
    const start = startOfWeekMonday(now)
    start.setDate(start.getDate() + offset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  const start = startOfYear(now)
  start.setFullYear(start.getFullYear() + offset)
  const end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { start, end }
}

export function getMinPeriodOffset(
  period: AnalysePeriod,
  accountCreatedAt: string,
  now = new Date(),
): number {
  const created = new Date(accountCreatedAt)

  if (period === 'week') {
    const createdWeek = startOfWeekMonday(created).getTime()
    const currentWeek = startOfWeekMonday(now).getTime()
    const weeks = Math.floor((currentWeek - createdWeek) / (7 * 24 * 60 * 60 * 1000))
    return -Math.max(0, weeks)
  }

  const years = now.getFullYear() - created.getFullYear()
  return -Math.max(0, years)
}

export function formatPeriodRangeLabel(period: AnalysePeriod, window: PeriodWindow): string {
  const { start, end } = window

  if (period === 'week') {
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatDayNumeric(start)} – ${formatDayNumeric(end)} ${end.getFullYear()}`
    }
    return `${formatDayNumeric(start)} ${start.getFullYear()} – ${formatDayNumeric(end)} ${end.getFullYear()}`
  }

  return String(start.getFullYear())
}

export function getChartColumnCount(period: AnalysePeriod, _window: PeriodWindow): number {
  if (period === 'week') return 7
  return YEAR_MONTH_LABELS.length
}

export function yearBucketLabels(): string[] {
  return [...YEAR_MONTH_LABELS]
}

export function monthIndexFromDate(date: Date): number {
  return date.getMonth()
}
