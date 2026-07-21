'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getActivityModuleLabel } from '@/lib/activity-modules'
import type { BilletterieCheckInData } from '@/lib/load-billetterie-checkin'
import { formatEventSlot } from '@/lib/billetterie-registration-view'
import { formatBoutiqueMoney } from '@/lib/boutique-order-view'
import { BilletterieCheckInScanner } from './BilletterieCheckInScanner'
import { CheckInStaffQr } from './CheckInStaffQr'
import { useCheckInMobileLayout } from './use-check-in-layout'

type Props = {
  data: BilletterieCheckInData
  preferScanMode?: boolean
}

export function BilletterieCheckInDashboard({ data: initialData, preferScanMode = false }: Props) {
  const [data, setData] = useState(initialData)
  const [selectedEventId, setSelectedEventId] = useState(initialData.selectedEventId ?? '')
  const [, startTransition] = useTransition()
  const isMobileLayout = useCheckInMobileLayout()

  const selectedEvent = useMemo(
    () => data.events.find((event) => event.id === selectedEventId) ?? null,
    [data.events, selectedEventId]
  )

  const scanMode = isMobileLayout || preferScanMode
  const canScanToday = Boolean(selectedEvent?.isToday)
  const showMobileScan = scanMode && canScanToday

  function refreshStats(eventId: string) {
    startTransition(async () => {
      const params = new URLSearchParams({ eventId })
      const response = await fetch(`/api/dashboard/billetterie/live-stats?${params.toString()}`)
      if (!response.ok) return
      const stats = (await response.json()) as BilletterieCheckInData['stats']
      setData((current) => ({ ...current, selectedEventId: eventId, stats }))
    })
  }

  return (
    <div
      className={`activite-page boutique-dash billetterie-dash billetterie-checkin${showMobileScan ? ' billetterie-checkin--mobile-scan' : ''}`}
    >
      <header className="boutique-dash__head">
        <div className="boutique-dash__head-main">
          <Link href="/dashboard/billetterie" className="billetterie-checkin__back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {getActivityModuleLabel('events')}
          </Link>
          <h1 className="boutique-dash__title">
            {showMobileScan ? 'Scan entrée' : 'Check-in jour J'}
          </h1>
          <p className="boutique-dash__subtitle">
            {showMobileScan
              ? 'Pointe la caméra vers le QR billet des participants.'
              : canScanToday
                ? 'Stats en direct — scannez depuis un téléphone via le QR ci-dessous.'
                : "Le scan s'active le jour de l'événement."}
          </p>
        </div>
      </header>

      {data.events.length === 0 ? (
        <div className="billetterie-checkin__empty">
          <p>Aucun événement à venir dans les 14 prochains jours.</p>
          <Link href="/dashboard/billetterie" className="btn btn--ghost">
            Retour {getActivityModuleLabel('events')}
          </Link>
        </div>
      ) : (
        <>
          {!showMobileScan ? (
            <section className="billetterie-checkin__toolbar" aria-label="Sélection événement">
              <label className="billetterie-checkin__select-label" htmlFor="checkin-event">
                Événement
              </label>
              <select
                id="checkin-event"
                className="billetterie-checkin__select"
                value={selectedEventId}
                onChange={(event) => {
                  const eventId = event.target.value
                  setSelectedEventId(eventId)
                  refreshStats(eventId)
                }}
              >
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {formatEventSlot(event.startAt, event.endAt)}
                    {event.isToday ? ' · Aujourd’hui' : ''}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          {data.stats ? (
            <section className="billetterie-checkin__stats" aria-label="Stats live">
              <article className="billetterie-checkin__stat">
                <span className="billetterie-checkin__stat-label">Entrées</span>
                <strong>
                  {data.stats.checkedInCount}/{data.stats.confirmedCount}
                </strong>
              </article>
              <article className="billetterie-checkin__stat">
                <span className="billetterie-checkin__stat-label">Ventes aujourd&apos;hui</span>
                <strong>{data.stats.salesToday}</strong>
              </article>
              <article className="billetterie-checkin__stat">
                <span className="billetterie-checkin__stat-label">CA billetterie</span>
                <strong>{formatBoutiqueMoney(data.stats.revenueCents)}</strong>
              </article>
            </section>
          ) : null}

          {selectedEvent && canScanToday ? (
            showMobileScan ? (
              <BilletterieCheckInScanner
                eventId={selectedEvent.id}
                mode="staff-mobile"
                onCheckedIn={() => refreshStats(selectedEvent.id)}
              />
            ) : (
              <div className="billetterie-checkin__desktop-grid">
                <CheckInStaffQr eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
                <BilletterieCheckInScanner
                  eventId={selectedEvent.id}
                  mode="staff-desktop"
                  onCheckedIn={() => refreshStats(selectedEvent.id)}
                />
              </div>
            )
          ) : selectedEvent ? (
            <p className="billetterie-checkin__hint billetterie-checkin__not-today">
              Check-in scan disponible le{' '}
              {new Date(selectedEvent.startAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              . En attendant, gère les inscriptions depuis l&apos;inbox {getActivityModuleLabel('events')}.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
