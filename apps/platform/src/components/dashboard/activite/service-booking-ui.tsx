'use client'

import type { ReactNode } from 'react'
import { CalendarClock, CircleCheck, Clock, UserX, X } from 'lucide-react'
import type { BookingStatus } from '@/lib/service-booking-view'
import {
  formatBookingSlot,
  formatServiceMoney,
  type ServiceBookingView,
} from '@/lib/service-booking-view'
import { ActiviteCatalogThumb } from './ActiviteCatalogThumb'

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: ReactNode }> = {
  pending: {
    label: 'À confirmer',
    color: 'status--pending',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  confirmed: {
    label: 'Confirmé',
    color: 'status--confirmed',
    icon: <CircleCheck className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Terminé',
    color: 'status--delivered',
    icon: <CalendarClock className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: 'Annulé',
    color: 'status--cancelled',
    icon: <X className="h-3.5 w-3.5" />,
  },
  no_show: {
    label: 'No-show',
    color: 'status--refunded',
    icon: <UserX className="h-3.5 w-3.5" />,
  },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`order-status-badge ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

const FORMAT_LABELS: Record<ServiceBookingView['locationType'], string> = {
  video: 'Visio',
  in_person: 'Sur place',
  phone: 'Téléphone',
}

export function InboxBookingCard({
  booking,
  selected,
  onSelect,
}: {
  booking: ServiceBookingView
  selected: boolean
  onSelect: () => void
}) {
  const formatLabel = FORMAT_LABELS[booking.locationType]

  return (
    <button
      type="button"
      className={`boutique-order-card boutique-order-card--media service-day-booking-card${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <ActiviteCatalogThumb imageUrl={booking.serviceImageUrl} alt="" />
      <div className="boutique-order-card__body">
        <div className="service-day-booking-card__top">
          <p className="boutique-order-card__customer service-day-booking-card__customer">
            {booking.customer}
          </p>
          <BookingStatusBadge status={booking.status} />
        </div>
        <div className="service-day-booking-card__service-row">
          <p className="service-day-booking-card__service">{booking.serviceTitle}</p>
          <span className={`service-day-booking-card__format is-${booking.locationType}`}>
            {formatLabel}
          </span>
        </div>
      </div>
    </button>
  )
}

export function BookingDetail({
  booking,
  onClose,
  compact = false,
}: {
  booking: ServiceBookingView
  onClose: () => void
  compact?: boolean
}) {
  const price = formatServiceMoney(booking.priceCents, booking.currency)

  return (
    <div className={`order-detail${compact ? ' order-detail--compact' : ''}`}>
      <div className="order-detail__header">
        <div>
          <p className="order-detail__ref">{booking.ref}</p>
          <p className="order-detail__date">{formatBookingSlot(booking.startAt, booking.endAt)}</p>
        </div>
        <button type="button" onClick={onClose} className="order-detail__close" aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="order-detail__body">
        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Client</h3>
          <p className="order-detail__value">{booking.customer}</p>
          <p className="order-detail__value order-detail__value--muted">{booking.email}</p>
          {booking.phone ? (
            <p className="order-detail__value order-detail__value--muted">{booking.phone}</p>
          ) : null}
        </section>

        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Prestation</h3>
          <p className="order-detail__value">{booking.serviceTitle}</p>
          <p className="order-detail__value order-detail__value--muted">
            {booking.serviceDurationMinutes} min · {booking.locationLabel}
          </p>
          {price ? <p className="order-detail__value">{price}</p> : null}
        </section>

        {booking.message ? (
          <section className="order-detail__section">
            <h3 className="order-detail__section-title">Message</h3>
            <p className="order-detail__value order-detail__value--muted">{booking.message}</p>
          </section>
        ) : null}

        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Statut</h3>
          <BookingStatusBadge status={booking.status} />
        </section>

        {booking.notes ? (
          <section className="order-detail__section">
            <h3 className="order-detail__section-title">Notes internes</h3>
            <p className="order-detail__value order-detail__value--muted">{booking.notes}</p>
          </section>
        ) : null}
      </div>
    </div>
  )
}
