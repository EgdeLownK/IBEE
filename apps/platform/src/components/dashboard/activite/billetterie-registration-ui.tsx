'use client'

import type { ReactNode } from 'react'
import { CircleCheck, X } from 'lucide-react'
import type { RegistrationStatus } from '@/lib/billetterie-registration-view'
import type { BannedClientView } from '@/lib/banned-client-view'
import {
  formatBilletterieRelativeTime,
  formatEventSlot,
  type BilletterieRegistrationView,
} from '@/lib/billetterie-registration-view'
import { ActiviteClientAvatar } from './ActiviteClientAvatar'

const STATUS_CONFIG: Record<RegistrationStatus, { label: string; color: string; icon: ReactNode }> =
  {
    confirmed: {
      label: 'Confirmé',
      color: 'status--confirmed',
      icon: <CircleCheck className="h-3.5 w-3.5" />,
    },
    cancelled: {
      label: 'Annulé',
      color: 'status--cancelled',
      icon: <X className="h-3.5 w-3.5" />,
    },
  }

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`order-status-badge ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

export function InboxRegistrationCard({
  registration,
  selected,
  onSelect,
  showEventTitle = true,
}: {
  registration: BilletterieRegistrationView
  selected: boolean
  onSelect: () => void
  showEventTitle?: boolean
}) {
  return (
    <button
      type="button"
      className={`boutique-order-card${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="boutique-order-card__top">
        <span className="boutique-order-card__ref">{registration.ref}</span>
        {registration.ticketTypeTitle ? (
          <span className="boutique-order-card__type">{registration.ticketTypeTitle}</span>
        ) : (
          <span className="boutique-order-card__type">
            {registration.eventLocationType === 'online' ? 'En ligne' : 'Sur place'}
          </span>
        )}
      </div>
      <p className="boutique-order-card__customer">{registration.attendeeName}</p>
      {showEventTitle ? (
        <p className="boutique-order-card__product">{registration.eventTitle}</p>
      ) : registration.ticketCode ? (
        <p className="boutique-order-card__product font-mono text-xs">{registration.ticketCode}</p>
      ) : null}
      <div className="boutique-order-card__footer">
        <RegistrationStatusBadge status={registration.status} />
        <span className="boutique-order-card__when">
          {formatBilletterieRelativeTime(registration.createdAt)}
        </span>
      </div>
    </button>
  )
}

export function ParticipantCard({
  registration,
  isNew,
  isBanned = false,
  selected,
  onSelect,
}: {
  registration: BilletterieRegistrationView
  isNew: boolean
  isBanned?: boolean
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`participant-card${selected ? ' is-selected' : ''}${isBanned ? ' is-banned' : ''}`}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="participant-card__identity">
        <span className="participant-card__name">{registration.attendeeName}</span>
      </div>
      <div className="participant-card__meta">
        {isNew ? <span className="participant-card__new">Nouveau</span> : null}
        {isBanned ? <span className="participant-card__banned">Banni</span> : null}
        <RegistrationStatusBadge status={registration.status} />
      </div>
    </button>
  )
}

export function BannedClientCard({
  client,
  selected,
  onSelect,
}: {
  client: BannedClientView
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`participant-card participant-card--banned${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <span className="participant-card__name">{client.name}</span>
      <div className="participant-card__meta">
        <span className="participant-card__banned">Banni</span>
      </div>
    </button>
  )
}

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

export function BannedClientDetail({
  client,
  compact = false,
  onClose,
}: {
  client: BannedClientView
  compact?: boolean
  onClose?: () => void
}) {
  return (
    <div className={`order-detail${compact ? ' order-detail--compact' : ''}`}>
      <div className="order-detail__header">
        <div className="order-detail__header-main order-detail__header-main--media">
          <ActiviteClientAvatar name={client.name} className="activite-client-avatar--detail" />
          <div>
            <p className="order-detail__ref">Client banni</p>
            <p className="order-detail__date">{client.name}</p>
            <div className="order-detail__status-row">
              <span className="participant-card__banned">Banni</span>
            </div>
          </div>
        </div>
        {onClose ? (
          <div className="order-detail__header-actions">
            <button type="button" className="order-detail__close" onClick={onClose} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="order-detail__body">
        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Contact</h3>
          <p className="order-detail__value">
            <a href={`mailto:${client.email}`}>{client.email}</a>
          </p>
          {client.phone ? (
            <p className="order-detail__value order-detail__value--muted">
              <a href={`tel:${client.phone}`}>{client.phone}</a>
            </p>
          ) : null}
        </section>

        {client.bannedAt ? (
          <section className="order-detail__section">
            <h3 className="order-detail__section-title">Modération</h3>
            <p className="order-detail__value order-detail__value--muted">
              Banni le {new Date(client.bannedAt).toLocaleString('fr-FR')}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export function RegistrationDetail({
  registration,
  compact = false,
  onClose,
}: {
  registration: BilletterieRegistrationView
  compact?: boolean
  onClose?: () => void
}) {
  const priceLabel =
    registration.priceCents != null
      ? registration.priceCents > 0
        ? formatMoney(registration.priceCents, registration.eventCurrency)
        : 'Gratuit'
      : null

  return (
    <div className={`order-detail${compact ? ' order-detail--compact' : ''}`}>
      <div className="order-detail__header">
        <div className="order-detail__header-main order-detail__header-main--media">
          <ActiviteClientAvatar
            name={registration.attendeeName}
            className="activite-client-avatar--detail"
          />
          <div>
            <p className="order-detail__ref">{registration.ref}</p>
            <p className="order-detail__date">
              Inscrit le {new Date(registration.createdAt).toLocaleString('fr-FR')}
            </p>
            <div className="order-detail__status-row">
              <RegistrationStatusBadge status={registration.status} />
              {registration.ticketTypeTitle ? (
                <span className="order-detail__type-pill">{registration.ticketTypeTitle}</span>
              ) : null}
            </div>
          </div>
        </div>
        {onClose ? (
          <div className="order-detail__header-actions">
            <button type="button" className="order-detail__close" onClick={onClose} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="order-detail__body">
        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Participant</h3>
          <p className="order-detail__value">{registration.attendeeName}</p>
          <p className="order-detail__value order-detail__value--muted">
            <a href={`mailto:${registration.attendeeEmail}`}>{registration.attendeeEmail}</a>
          </p>
          {registration.attendeePhone ? (
            <p className="order-detail__value order-detail__value--muted">
              <a href={`tel:${registration.attendeePhone}`}>{registration.attendeePhone}</a>
            </p>
          ) : null}
        </section>

        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Billet</h3>
          {registration.ticketCode ? (
            <p className="order-detail__value font-mono text-sm">{registration.ticketCode}</p>
          ) : null}
          {priceLabel ? <p className="order-detail__value">{priceLabel}</p> : null}
          {registration.promoCode ? (
            <p className="order-detail__value order-detail__value--muted">
              Code promo : {registration.promoCode}
            </p>
          ) : null}
          {registration.discountCents != null && registration.discountCents > 0 ? (
            <p className="order-detail__value order-detail__value--muted">
              Remise : -{formatMoney(registration.discountCents, registration.eventCurrency)}
            </p>
          ) : null}
          {registration.refundCents > 0 ? (
            <p className="order-detail__value order-detail__value--muted">
              Remboursé : {formatMoney(registration.refundCents, registration.eventCurrency)}
            </p>
          ) : null}
        </section>

        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Événement</h3>
          <p className="order-detail__value">{registration.eventTitle}</p>
          {registration.activityTitle ? (
            <p className="order-detail__value order-detail__value--muted">
              Place : {registration.activityTitle}
            </p>
          ) : null}
          <p className="order-detail__value order-detail__value--muted">
            {formatEventSlot(registration.eventStartAt, registration.eventEndAt)}
          </p>
          {registration.eventCapacity != null ? (
            <p className="order-detail__value order-detail__value--muted">
              Jauge {registration.eventCapacity} places
            </p>
          ) : null}
        </section>

        {registration.checkedInAt ? (
          <section className="order-detail__section">
            <h3 className="order-detail__section-title">Entrée</h3>
            <p className="order-detail__value order-detail__value--muted">
              {new Date(registration.checkedInAt).toLocaleString('fr-FR')}
            </p>
          </section>
        ) : null}

        {registration.message ? (
          <section className="order-detail__section">
            <h3 className="order-detail__section-title">Message</h3>
            <p className="order-detail__value order-detail__value--muted">{registration.message}</p>
          </section>
        ) : null}

        {registration.formAnswers.length > 0 ? (
          <section className="order-detail__section">
            <h3 className="order-detail__section-title">Formulaire</h3>
            <ul className="order-detail__form-answers">
              {registration.formAnswers.map((answer) => (
                <li key={`${answer.label}-${answer.value}`}>
                  <span>{answer.label}</span> — {answer.value}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
