'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check, Mail, Phone, UserX, X } from 'lucide-react'
import {
  cancelBookingAction,
  completeBookingAction,
  confirmBookingAction,
  markBookingNoShowAction,
  updateClientNotesAction,
} from '@/app/dashboard/service-actions'
import {
  formatBookingSlot,
  formatServiceMoney,
  type ServiceBookingView,
} from '@/lib/service-booking-view'
import type { ServiceClientView } from '@/lib/service-client-view'
import { BookingStatusBadge } from './service-booking-ui'
import { ActiviteClientAvatar } from './ActiviteClientAvatar'

type Props = {
  client: ServiceClientView | null
  booking: ServiceBookingView
  bookings: ServiceBookingView[]
  onClose?: () => void
}

function formatClientDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ServiceClientDetail({ client, booking, bookings, onClose }: Props) {
  const [notesDraft, setNotesDraft] = useState(client?.notes ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [actionId, setActionId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const displayName = client?.name ?? booking.customer
  const displayEmail = client?.email ?? booking.email
  const displayPhone = client?.phone ?? booking.phone

  useEffect(() => {
    setNotesDraft(client?.notes ?? '')
    setSaveState('idle')
  }, [client?.id, client?.notes, booking.id])

  const clientBookings = useMemo(() => {
    const email = displayEmail.trim().toLowerCase()
    if (!email) return [booking]
    return bookings
      .filter((item) => item.email.trim().toLowerCase() === email)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
  }, [bookings, booking, displayEmail])

  const price = formatServiceMoney(booking.priceCents, booking.currency)

  function saveNotes() {
    if (!client) return
    setSaveState('saving')
    startTransition(async () => {
      const result = await updateClientNotesAction(client.id, notesDraft.trim() || null)
      setSaveState(result.ok ? 'saved' : 'error')
      if (result.ok) router.refresh()
    })
  }

  function runAction(action: () => Promise<{ ok: boolean }>) {
    setActionId(booking.id)
    startTransition(async () => {
      await action()
      setActionId(null)
      router.refresh()
    })
  }

  return (
    <div className="order-detail order-detail--compact service-client-detail">
      <div className="order-detail__header">
        <div className="order-detail__header-main order-detail__header-main--media">
          <ActiviteClientAvatar name={displayName} className="activite-client-avatar--detail" />
          <div>
            <p className="service-clients__detail-name">{displayName}</p>
            <p className="service-clients__detail-meta">
              {client
                ? `${client.bookingsCount} rendez-vous${client.totalRevenueLabel ? ` · ${client.totalRevenueLabel} cumulés` : ''}`
                : 'Client invité'}
            </p>
          </div>
        </div>
        {onClose ? (
          <div className="order-detail__header-actions">
            <button
              type="button"
              onClick={onClose}
              className="order-detail__close"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="order-detail__body">
        <ul className="service-clients__contact">
          <li>
            <Mail className="h-4 w-4" aria-hidden="true" />
            <a href={`mailto:${displayEmail}`}>{displayEmail}</a>
          </li>
          {displayPhone ? (
            <li>
              <Phone className="h-4 w-4" aria-hidden="true" />
              <a href={`tel:${displayPhone}`}>{displayPhone}</a>
            </li>
          ) : null}
        </ul>

        {client ? (
          <div className="service-clients__notes">
            <label htmlFor="client-notes-inbox" className="service-clients__notes-label">
              Notes internes
            </label>
            <textarea
              id="client-notes-inbox"
              className="service-clients__notes-input"
              rows={3}
              value={notesDraft}
              onChange={(event) => {
                setNotesDraft(event.target.value)
                setSaveState('idle')
              }}
              placeholder="Préférences, contexte, suivi…"
            />
            <div className="service-clients__notes-actions">
              <button
                type="button"
                className="boutique-inbox__action-btn"
                disabled={saveState === 'saving'}
                onClick={saveNotes}
              >
                {saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {saveState === 'saved' ? (
                <span className="service-clients__save-ok">Enregistré</span>
              ) : null}
              {saveState === 'error' ? (
                <span className="service-clients__save-error">Erreur d’enregistrement</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="service-client-detail__booking">
          <h4 className="service-client-detail__booking-title">Rendez-vous sélectionné</h4>
          <p className="service-client-detail__booking-ref">{booking.ref}</p>
          <p className="service-client-detail__booking-slot">
            {formatBookingSlot(booking.startAt, booking.endAt)}
          </p>
          <div className="service-client-detail__booking-meta">
            <BookingStatusBadge status={booking.status} />
            <span>{booking.serviceTitle}</span>
            {price ? <span>{price}</span> : null}
          </div>
          {booking.message ? (
            <p className="service-client-detail__booking-message">{booking.message}</p>
          ) : null}

          <div className="boutique-inbox__quick-action boutique-inbox__quick-action--stack">
            {booking.status === 'pending' ? (
              <>
                <button
                  type="button"
                  className="boutique-inbox__action-btn"
                  disabled={actionId === booking.id}
                  onClick={() => runAction(() => confirmBookingAction(booking.id))}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {actionId === booking.id ? '…' : 'Confirmer'}
                </button>
                <button
                  type="button"
                  className="boutique-inbox__action-btn boutique-inbox__action-btn--ghost"
                  disabled={actionId === booking.id}
                  onClick={() => runAction(() => cancelBookingAction(booking.id))}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Refuser
                </button>
              </>
            ) : null}

            {booking.status === 'confirmed' ? (
              <>
                <button
                  type="button"
                  className="boutique-inbox__action-btn"
                  disabled={actionId === booking.id}
                  onClick={() => runAction(() => completeBookingAction(booking.id))}
                >
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {actionId === booking.id ? '…' : 'Marquer terminé'}
                </button>
                <button
                  type="button"
                  className="boutique-inbox__action-btn boutique-inbox__action-btn--ghost"
                  disabled={actionId === booking.id}
                  onClick={() => runAction(() => markBookingNoShowAction(booking.id))}
                >
                  <UserX className="h-4 w-4" aria-hidden="true" />
                  No-show
                </button>
                <button
                  type="button"
                  className="boutique-inbox__action-btn boutique-inbox__action-btn--ghost"
                  disabled={actionId === booking.id}
                  onClick={() => runAction(() => cancelBookingAction(booking.id))}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Annuler
                </button>
              </>
            ) : null}
          </div>
        </section>

        <section className="service-clients__history-block">
          <h4 className="service-clients__history-title">Historique rendez-vous</h4>
          {clientBookings.length === 0 ? (
            <p className="service-clients__history-empty">Aucun autre rendez-vous.</p>
          ) : (
            <ul className="service-clients__history">
              {clientBookings.slice(0, 8).map((item) => (
                <li
                  key={item.id}
                  className={`service-clients__history-item${item.id === booking.id ? ' is-current' : ''}`}
                >
                  <div className="service-clients__history-main">
                    <span className="service-clients__history-service">{item.serviceTitle}</span>
                    <span className="service-clients__history-slot">
                      {formatBookingSlot(item.startAt, item.endAt)}
                    </span>
                  </div>
                  <BookingStatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
          {client?.lastBookingAt ? (
            <p className="service-client-detail__last">
              Dernier RDV : {formatClientDate(client.lastBookingAt)}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
