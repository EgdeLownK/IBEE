'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  blockAvailabilityDateAction,
  removeAvailabilityExceptionAction,
  saveWeeklyAvailabilityAction,
} from '@/app/dashboard/activite/service-actions'
import type { ServiceDashboardData } from '@/lib/service-booking-view'
import {
  formatPlanningDate,
  schedulesToWeeklyHours,
  weeklyHoursToSchedules,
  type WeeklyHoursDay,
} from '@/lib/service-planning-view'

type Props = {
  data: ServiceDashboardData
}

export function ServicePlanningPanel({ data }: Props) {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHoursDay[]>(() =>
    schedulesToWeeklyHours(data.schedules)
  )
  const [blockDate, setBlockDate] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [hoursMessage, setHoursMessage] = useState<string | null>(null)
  const [blockMessage, setBlockMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setWeeklyHours(schedulesToWeeklyHours(data.schedules))
  }, [data.schedules])

  const sortedExceptions = useMemo(
    () =>
      [...data.exceptions].sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date)
        if (dateCmp !== 0) return dateCmp
        return (a.startTime ?? '').localeCompare(b.startTime ?? '')
      }),
    [data.exceptions]
  )

  function updateWeeklyDay(dayOfWeek: number, patch: Partial<WeeklyHoursDay>) {
    setWeeklyHours((current) =>
      current.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day))
    )
  }

  function saveWeeklyHours() {
    setHoursMessage(null)
    startTransition(async () => {
      const result = await saveWeeklyAvailabilityAction(weeklyHoursToSchedules(weeklyHours))
      if (!result.ok) {
        setHoursMessage(result.error)
        return
      }
      setHoursMessage('Horaires enregistrés.')
      router.refresh()
    })
  }

  function blockDateSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBlockMessage(null)
    if (!blockDate) {
      setBlockMessage('Choisis une date.')
      return
    }

    startTransition(async () => {
      const result = await blockAvailabilityDateAction({
        date: blockDate,
        reason: blockReason,
      })
      if (!result.ok) {
        setBlockMessage(result.error)
        return
      }
      setBlockDate('')
      setBlockReason('')
      setBlockMessage('Date bloquée.')
      router.refresh()
    })
  }

  function removeException(exceptionId: string) {
    startTransition(async () => {
      await removeAvailabilityExceptionAction(exceptionId)
      router.refresh()
    })
  }

  return (
    <div className="service-planning">
      <div className="service-planning__toolbar">
        <p className="service-planning__intro">
          Créneaux ouverts à la réservation et jours indisponibles. L&apos;agenda est dans
          l&apos;onglet Rendez-vous.
        </p>
      </div>

      <div className="service-planning__settings">
        <section className="service-planning__card">
          <header className="service-planning__card-head">
            <h2 className="service-planning__card-title">Horaires hebdomadaires</h2>
            <p className="service-planning__card-sub">
              Créneaux proposés aux clients pour la réservation en ligne.
            </p>
          </header>

          <div className="service-planning__hours">
            {weeklyHours.map((day) => (
              <div key={day.dayOfWeek} className="service-planning__hours-row">
                <label className="service-planning__hours-day">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) =>
                      updateWeeklyDay(day.dayOfWeek, { enabled: event.target.checked })
                    }
                  />
                  <span>{day.label}</span>
                </label>
                <input
                  type="time"
                  className="service-planning__time-input"
                  value={day.startTime}
                  disabled={!day.enabled}
                  onChange={(event) =>
                    updateWeeklyDay(day.dayOfWeek, { startTime: event.target.value })
                  }
                />
                <span className="service-planning__hours-sep">—</span>
                <input
                  type="time"
                  className="service-planning__time-input"
                  value={day.endTime}
                  disabled={!day.enabled}
                  onChange={(event) =>
                    updateWeeklyDay(day.dayOfWeek, { endTime: event.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <div className="service-planning__card-actions">
            <button
              type="button"
              className="service-planning__save-btn"
              disabled={pending}
              onClick={saveWeeklyHours}
            >
              {pending ? 'Enregistrement…' : 'Enregistrer les horaires'}
            </button>
            {hoursMessage ? <p className="service-planning__message">{hoursMessage}</p> : null}
          </div>
        </section>

        <section className="service-planning__card">
          <header className="service-planning__card-head">
            <h2 className="service-planning__card-title">Absences & blocages</h2>
            <p className="service-planning__card-sub">
              Congés, jours fermés ou créneaux exceptionnels.
            </p>
          </header>

          <form className="service-planning__block-form" onSubmit={blockDateSubmit}>
            <input
              type="date"
              className="service-planning__date-input"
              value={blockDate}
              onChange={(event) => setBlockDate(event.target.value)}
            />
            <input
              type="text"
              className="service-planning__reason-input"
              value={blockReason}
              placeholder="Motif (optionnel)"
              onChange={(event) => setBlockReason(event.target.value)}
            />
            <button type="submit" className="service-planning__save-btn" disabled={pending}>
              Bloquer
            </button>
          </form>
          {blockMessage ? <p className="service-planning__message">{blockMessage}</p> : null}

          {sortedExceptions.length === 0 ? (
            <p className="service-planning__empty">Aucune exception enregistrée.</p>
          ) : (
            <ul className="service-planning__exceptions">
              {sortedExceptions.map((item) => (
                <li key={item.id} className="service-planning__exception">
                  <div>
                    <p className="service-planning__exception-date">{formatPlanningDate(item.date)}</p>
                    <p className="service-planning__exception-meta">
                      {item.isBlocked
                        ? item.reason?.trim() || 'Jour bloqué'
                        : `${item.startTime} — ${item.endTime}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="service-planning__exception-remove"
                    disabled={pending}
                    onClick={() => removeException(item.id)}
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
