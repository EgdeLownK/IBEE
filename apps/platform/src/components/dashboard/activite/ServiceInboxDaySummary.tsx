'use client'

import { useMemo } from 'react'
import {
  buildServiceDaySummary,
  type ServiceBookingView,
} from '@/lib/service-booking-view'

type Props = {
  bookings: ServiceBookingView[]
}

export function ServiceInboxDaySummary({ bookings }: Props) {
  const lines = useMemo(() => buildServiceDaySummary(bookings), [bookings])

  if (lines.length === 0) return null

  return (
    <section className="boutique-inbox__filter-summary" aria-label="Résumé du jour">
      <ul className="boutique-inbox__filter-summary-list">
        {lines.map((line) => (
          <li key={line.key} className="boutique-inbox__filter-summary-product">
            <span className="boutique-inbox__filter-summary-product-name">{line.name}</span>
            <span className="boutique-inbox__filter-summary-product-qty">× {line.qty}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
