import type { ServiceBookingView } from '@/lib/service-booking-view'

export type AvailabilityScheduleRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type AvailabilityExceptionRow = {
  id: string
  date: string
  isBlocked: boolean
  startTime: string | null
  endTime: string | null
  reason: string | null
}

export type WeeklyHoursDay = {
  dayOfWeek: number
  label: string
  enabled: boolean
  startTime: string
  endTime: string
}

export const WEEKDAY_LABELS: ReadonlyArray<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: 'Lundi' },
  { dayOfWeek: 2, label: 'Mardi' },
  { dayOfWeek: 3, label: 'Mercredi' },
  { dayOfWeek: 4, label: 'Jeudi' },
  { dayOfWeek: 5, label: 'Vendredi' },
  { dayOfWeek: 6, label: 'Samedi' },
  { dayOfWeek: 0, label: 'Dimanche' },
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '18:00'

function normalizeTime(value: string): string {
  return value.slice(0, 5)
}

export function formatPlanningDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const offset = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - offset)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const startLabel = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const endLabel = weekEnd.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: weekEnd.getFullYear() !== weekStart.getFullYear() ? 'numeric' : undefined,
  })
  return `${startLabel} — ${endLabel}`
}

export function mapScheduleRows(
  rows: Array<{ id: string; day_of_week: number; start_time: string; end_time: string }>
): AvailabilityScheduleRow[] {
  return rows.map((row) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
  }))
}

export function mapExceptionRows(
  rows: Array<{
    id: string
    date: string
    is_blocked: boolean
    start_time: string | null
    end_time: string | null
    reason: string | null
  }>
): AvailabilityExceptionRow[] {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    isBlocked: row.is_blocked,
    startTime: row.start_time ? normalizeTime(row.start_time) : null,
    endTime: row.end_time ? normalizeTime(row.end_time) : null,
    reason: row.reason,
  }))
}

export function schedulesToWeeklyHours(schedules: AvailabilityScheduleRow[]): WeeklyHoursDay[] {
  const byDay = new Map<number, AvailabilityScheduleRow>()
  for (const row of schedules) {
    if (!byDay.has(row.dayOfWeek)) byDay.set(row.dayOfWeek, row)
  }

  return WEEKDAY_LABELS.map(({ dayOfWeek, label }) => {
    const row = byDay.get(dayOfWeek)
    return {
      dayOfWeek,
      label,
      enabled: Boolean(row),
      startTime: row?.startTime ?? DEFAULT_START,
      endTime: row?.endTime ?? DEFAULT_END,
    }
  })
}

export function weeklyHoursToSchedules(days: WeeklyHoursDay[]) {
  return days
    .filter((day) => day.enabled)
    .map((day) => ({
      day_of_week: day.dayOfWeek,
      start_time: day.startTime,
      end_time: day.endTime,
    }))
}

export function groupBookingsByDay(
  bookings: ServiceBookingView[],
  weekStart: Date
): Map<string, ServiceBookingView[]> {
  const days = getWeekDays(weekStart)
  const map = new Map<string, ServiceBookingView[]>()
  for (const day of days) {
    map.set(toIsoDate(day), [])
  }

  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue
    const key = toIsoDate(new Date(booking.startAt))
    const bucket = map.get(key)
    if (bucket) bucket.push(booking)
  }

  for (const [, list] of map) {
    list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }

  return map
}

export function formatBookingTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function getExceptionForDate(
  exceptions: AvailabilityExceptionRow[],
  isoDate: string
): AvailabilityExceptionRow | undefined {
  return exceptions.find((item) => item.date === isoDate)
}
