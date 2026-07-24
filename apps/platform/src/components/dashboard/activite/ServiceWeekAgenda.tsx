'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ServiceBookingView } from '@/lib/service-booking-view'
import type { AvailabilityExceptionRow } from '@/lib/service-planning-view'
import {
  addDays,
  formatPlanningDate,
  formatWeekRangeLabel,
  getExceptionForDate,
  getWeekDays,
  groupBookingsByDay,
  startOfWeekMonday,
  toIsoDate,
} from '@/lib/service-planning-view'

type Props = {
  bookings: ServiceBookingView[]
  exceptions: AvailabilityExceptionRow[]
  weekStart: Date
  selectedDay: string
  onWeekStartChange: (date: Date) => void
  onSelectDay: (isoDate: string) => void
}

export function ServiceWeekAgenda({
  bookings,
  exceptions,
  weekStart,
  selectedDay,
  onWeekStartChange,
  onSelectDay,
}: Props) {
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const bookingsByDay = useMemo(
    () => groupBookingsByDay(bookings, weekStart),
    [bookings, weekStart],
  )

  function shiftWeek(delta: number) {
    onWeekStartChange(addDays(weekStart, delta * 7))
  }

  return (
    <section className="service-agenda" aria-label="Agenda hebdomadaire">
      <div className="service-agenda__toolbar">
        <div className="service-planning__week-nav">
          <button
            type="button"
            className="service-planning__nav-btn"
            aria-label="Semaine précédente"
            onClick={() => shiftWeek(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="service-planning__week-label">
            <strong>{formatWeekRangeLabel(weekStart)}</strong>
            <button
              type="button"
              className="service-planning__today-btn"
              onClick={() => {
                const todayWeek = startOfWeekMonday(new Date())
                onWeekStartChange(todayWeek)
                onSelectDay(toIsoDate(new Date()))
              }}
            >
              Aujourd&apos;hui
            </button>
          </div>
          <button
            type="button"
            className="service-planning__nav-btn"
            aria-label="Semaine suivante"
            onClick={() => shiftWeek(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="service-agenda__week" role="tablist" aria-label="Jours de la semaine">
        {weekDays.map((day) => {
          const iso = toIsoDate(day)
          const isToday = iso === toIsoDate(new Date())
          const isSelected = iso === selectedDay
          const exception = getExceptionForDate(exceptions, iso)
          const dayBookings = bookingsByDay.get(iso) ?? []
          const count = dayBookings.length

          return (
            <button
              key={iso}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`service-agenda__day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${exception?.isBlocked ? ' is-blocked' : ''}`}
              onClick={() => onSelectDay(iso)}
            >
              <span className="service-agenda__day-label">{formatPlanningDate(iso)}</span>
              <span className="service-agenda__day-count">{count > 0 ? `${count} RDV` : '—'}</span>
              {exception ? (
                <span className="service-agenda__day-badge">
                  {exception.isBlocked ? 'Bloqué' : 'Spécial'}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
