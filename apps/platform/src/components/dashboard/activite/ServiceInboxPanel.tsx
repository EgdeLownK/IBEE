'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  bookingIsoDate,
  bookingsOnDate,
  groupBookingsByHour,
  type ServiceDashboardData,
} from '@/lib/service-booking-view'
import { findClientForBooking } from '@/lib/service-client-view'
import {
  getWeekDays,
  startOfWeekMonday,
  toIsoDate,
} from '@/lib/service-planning-view'
import { ServiceClientProfile } from './ServiceClientProfile'
import { ServiceClientDetail } from './ServiceClientDetail'
import { ServiceSidePanel } from './ServiceSidePanel'
import { ServiceWeekAgenda } from './ServiceWeekAgenda'
import { ServiceInboxDaySummary } from './ServiceInboxDaySummary'
import { InboxBookingCard } from './service-booking-ui'

type Props = {
  data: ServiceDashboardData
}

function defaultSelectedDay(): string {
  return toIsoDate(new Date())
}

export function ServiceInboxPanel({ data }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const [selectedDay, setSelectedDay] = useState(defaultSelectedDay)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const dayBookings = useMemo(
    () => bookingsOnDate(data.bookings, selectedDay),
    [data.bookings, selectedDay]
  )

  const bookingHourGroups = useMemo(
    () => groupBookingsByHour(dayBookings),
    [dayBookings]
  )

  useEffect(() => {
    const weekDays = getWeekDays(weekStart).map((day) => toIsoDate(day))
    if (!weekDays.includes(selectedDay)) {
      const today = toIsoDate(new Date())
      setSelectedDay(weekDays.includes(today) ? today : weekDays[0])
    }
  }, [weekStart, selectedDay])

  useEffect(() => {
    if (!selectedId) return
    const stillExists = data.bookings.some((booking) => booking.id === selectedId)
    if (!stillExists) setSelectedId(null)
  }, [data.bookings, selectedId])

  const selectedBooking =
    data.bookings.find((booking) => booking.id === selectedId) ?? null
  const bookingClient = selectedBooking
    ? findClientForBooking(data.clients, selectedBooking)
    : null

  const profileClient =
    data.clients.find((client) => client.id === selectedClientId) ?? null

  const selectedDayLabel = useMemo(() => {
    const today = toIsoDate(new Date())
    if (selectedDay === today) return "Aujourd'hui"
    const date = new Date(`${selectedDay}T12:00:00`)
    const label = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [selectedDay])

  function selectBooking(bookingId: string) {
    const booking = data.bookings.find((item) => item.id === bookingId)
    if (!booking) return
    setSelectedClientId(null)
    setSelectedDay(bookingIsoDate(booking.startAt))
    setSelectedId(bookingId)
  }

  function selectClient(clientId: string) {
    const client = data.clients.find((item) => item.id === clientId)
    if (!client) return
    setSelectedId(null)
    setSelectedClientId(clientId)
  }

  return (
    <div className="service-inbox">
      <ServiceWeekAgenda
        bookings={data.bookings}
        exceptions={data.exceptions}
        weekStart={weekStart}
        selectedDay={selectedDay}
        onWeekStartChange={setWeekStart}
        onSelectDay={(day) => {
          setSelectedClientId(null)
          setSelectedDay(day)
        }}
      />

      <div className="boutique-inbox">
        <div className="boutique-inbox__file">
          {profileClient ? (
            <div className="service-inbox__client-file">
              <ServiceClientProfile
                client={profileClient}
                bookings={data.bookings}
                embedded
                onClose={() => setSelectedClientId(null)}
              />
            </div>
          ) : (
            <>
          <header className="boutique-inbox__file-head">
            <h2 className="boutique-inbox__file-title">{selectedDayLabel}</h2>
            <span className="boutique-inbox__file-count">
              {dayBookings.length} rendez-vous
            </span>
          </header>

          <ServiceInboxDaySummary bookings={dayBookings} />

          {dayBookings.length === 0 ? (
            <p className="boutique-inbox__empty">Aucun rendez-vous ce jour-là.</p>
          ) : (
            <div className="boutique-inbox__groups">
              {bookingHourGroups.map((group) => (
                <section key={group.hourLabel} className="boutique-inbox__group">
                  <h3 className="boutique-inbox__group-label">{group.hourLabel}</h3>
                  <ul className="boutique-inbox__list">
                    {group.bookings.map((booking) => (
                      <li key={booking.id}>
                        <InboxBookingCard
                          booking={booking}
                          selected={selectedId === booking.id}
                          onSelect={() => selectBooking(booking.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
            </>
          )}
        </div>

        <aside
          className={`boutique-inbox__detail${selectedBooking ? ' boutique-inbox__detail--order' : ''}`}
        >
          {selectedBooking ? (
            <ServiceClientDetail
              client={bookingClient}
              booking={selectedBooking}
              bookings={data.bookings}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <ServiceSidePanel
              bookings={data.bookings}
              services={data.services}
              clients={data.clients}
              selectedClientId={selectedClientId}
              onSelectBooking={selectBooking}
              onSelectClient={selectClient}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
