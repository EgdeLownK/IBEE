'use client'

import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { buildServiceRecentActivity, formatServiceRelativeTime } from '@/lib/service-catalog-view'
import type { ServiceBookingView } from '@/lib/service-booking-view'

type Props = {
  bookings: ServiceBookingView[]
  onSelectBooking: (bookingId: string) => void
}

export function ServiceActivityFeed({ bookings, onSelectBooking }: Props) {
  const activity = useMemo(() => buildServiceRecentActivity(bookings), [bookings])

  return (
    <div className="boutique-shop-activity">
      <div className="boutique-shop-activity__body">
        {activity.length === 0 ? (
          <div className="boutique-shop-activity__empty">
            <Activity className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Aucune activité enregistrée pour le moment.</p>
          </div>
        ) : (
          <ol className="boutique-shop-activity__list">
            {activity.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="boutique-shop-activity__item"
                  onClick={() => onSelectBooking(item.bookingId)}
                >
                  <span className="boutique-shop-activity__dot" aria-hidden="true" />
                  <span className="boutique-shop-activity__content">
                    <span className="boutique-shop-activity__row">
                      <span className="boutique-shop-activity__event">{item.title}</span>
                      <time className="boutique-shop-activity__when" dateTime={item.at}>
                        {formatServiceRelativeTime(item.at)}
                      </time>
                    </span>
                    <span className="boutique-shop-activity__order">
                      {item.customer} · {item.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
