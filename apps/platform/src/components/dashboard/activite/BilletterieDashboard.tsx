'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Plus, QrCode } from 'lucide-react'
import type { LoadedBilletterieDashboard } from '@/lib/load-billetterie-data'
import { getActivityModuleLabel } from '@/lib/activity-modules'
import { useActivityOverlay } from './ActivityOverlayProvider'
import { BilletterieJourJBand } from './BilletterieJourJBand'
import { EventWorkspacePanel } from './EventWorkspacePanel'
import { useCheckInMobileLayout } from './use-check-in-layout'

type Props = {
  data: LoadedBilletterieDashboard
}

function billetterieDateLine() {
  const today = new Date()
  const dayName = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const month = today.toLocaleDateString('fr-FR', { month: 'long' })
  const label = `${dayName} ${today.getDate()} ${month}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function BilletterieDashboard({ data }: Props) {
  const { openOverlay } = useActivityOverlay()
  const dateLine = useMemo(() => billetterieDateLine(), [])
  const isMobile = useCheckInMobileLayout()

  const upcomingCount = data.registrations.filter(
    (r) => r.status === 'confirmed' && new Date(r.eventStartAt).getTime() >= Date.now(),
  ).length

  const todayLive = data.today.todayEventLive
  const checkInHref = todayLive
    ? `/dashboard/billetterie/check-in?eventId=${todayLive.eventId}${isMobile ? '&scan=1' : ''}`
    : null

  return (
    <div className="activite-page boutique-dash billetterie-dash event-dash">
      <header className="boutique-dash__head">
        <div className="boutique-dash__head-main">
          <h1 className="boutique-dash__title">{getActivityModuleLabel('events')}</h1>
          <p className="boutique-dash__subtitle">
            {dateLine}
            {data.eventLines.length > 0
              ? ` · ${data.eventLines.length} événement${data.eventLines.length > 1 ? 's' : ''}`
              : ''}
            {upcomingCount > 0
              ? ` · ${upcomingCount} inscription${upcomingCount > 1 ? 's' : ''} à venir`
              : ''}
          </p>
        </div>
        <div className="boutique-dash__head-actions">
          {checkInHref ? (
            <Link
              href={checkInHref}
              className="boutique-dash__head-btn boutique-dash__head-btn--primary"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              Mode entrée
            </Link>
          ) : null}
          <button
            type="button"
            className={`boutique-dash__head-btn${checkInHref ? '' : ' boutique-dash__head-btn--primary'}`}
            onClick={() => openOverlay('event')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un événement
          </button>
        </div>
      </header>

      {todayLive ? <BilletterieJourJBand live={todayLive} /> : null}

      <div className="boutique-dash__workspace">
        <EventWorkspacePanel data={data} />
      </div>
    </div>
  )
}
