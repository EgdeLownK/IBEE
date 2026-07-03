'use client'

import Link from 'next/link'
import { QrCode, Zap } from 'lucide-react'
import { formatBoutiqueMoney } from '@/lib/boutique-order-view'
import type { BilletterieTodaySnapshot } from '@/lib/billetterie-registration-view'
import { useCheckInMobileLayout } from './use-check-in-layout'

type Props = {
  live: NonNullable<BilletterieTodaySnapshot['todayEventLive']>
}

export function BilletterieJourJBand({ live }: Props) {
  const isMobile = useCheckInMobileLayout()
  const checkInHref = `/dashboard/activite/billetterie/check-in?eventId=${live.eventId}${isMobile ? '&scan=1' : ''}`

  return (
    <section className="billetterie-jourj" aria-label="Événement jour J">
      <div className="billetterie-jourj__main">
        <span className="billetterie-jourj__badge">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Jour J
        </span>
        <div>
          <h2 className="billetterie-jourj__title">{live.eventTitle}</h2>
          <p className="billetterie-jourj__meta">
            {live.checkedInCount}/{live.confirmedCount} entrées ·{' '}
            {formatBoutiqueMoney(live.revenueCents)} · {live.salesToday} vente
            {live.salesToday > 1 ? 's' : ''} aujourd&apos;hui
          </p>
        </div>
      </div>
      <Link href={checkInHref} className="billetterie-jourj__cta">
        <QrCode className="h-4 w-4" aria-hidden="true" />
        {isMobile ? 'Scanner' : 'Mode entrée'}
      </Link>
    </section>
  )
}
