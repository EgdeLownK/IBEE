'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone, X } from 'lucide-react'
import { updateClientNotesAction } from '@/app/dashboard/service-actions'
import {
  formatBookingSlot,
  type ServiceBookingView,
} from '@/lib/service-booking-view'
import type { ServiceClientView } from '@/lib/service-client-view'
import { BookingStatusBadge } from './service-booking-ui'
import { ActiviteClientAvatar } from './ActiviteClientAvatar'

type Props = {
  client: ServiceClientView
  bookings: ServiceBookingView[]
  onClose?: () => void
  embedded?: boolean
}

function ClientBookingHistory({ bookings }: { bookings: ServiceBookingView[] }) {
  if (bookings.length === 0) {
    return <p className="service-clients__history-empty">Aucun rendez-vous lié.</p>
  }

  return (
    <ul className="service-clients__history">
      {bookings.slice(0, 8).map((booking) => (
        <li key={booking.id} className="service-clients__history-item">
          <div className="service-clients__history-main">
            <span className="service-clients__history-service">{booking.serviceTitle}</span>
            <span className="service-clients__history-slot">
              {formatBookingSlot(booking.startAt, booking.endAt)}
            </span>
          </div>
          <BookingStatusBadge status={booking.status} />
        </li>
      ))}
    </ul>
  )
}

export function ServiceClientProfile({ client, bookings, onClose, embedded = false }: Props) {
  const [notesDraft, setNotesDraft] = useState(client.notes ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setNotesDraft(client.notes ?? '')
    setSaveState('idle')
  }, [client.id, client.notes])

  const clientBookings = useMemo(() => {
    const email = client.email.toLowerCase()
    return bookings
      .filter((booking) => booking.email.toLowerCase() === email)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
  }, [bookings, client.email])

  function saveNotes() {
    setSaveState('saving')
    startTransition(async () => {
      const result = await updateClientNotesAction(client.id, notesDraft.trim() || null)
      setSaveState(result.ok ? 'saved' : 'error')
      if (result.ok) router.refresh()
    })
  }

  return (
    <div
      className={`service-clients__detail${embedded ? ' service-clients__detail--embedded' : ''}`}
    >
      <header className="service-clients__detail-head service-clients__detail-head--media">
        <div className="service-clients__detail-head-main">
          <ActiviteClientAvatar name={client.name} className="activite-client-avatar--detail" />
          <div>
            <h3 className="service-clients__detail-name">{client.name}</h3>
            <p className="service-clients__detail-meta">
              {client.bookingsCount} rendez-vous
              {client.totalRevenueLabel ? ` · ${client.totalRevenueLabel} cumulés` : ''}
            </p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            className="order-detail__close"
            onClick={onClose}
            aria-label="Fermer la fiche client"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      <ul className="service-clients__contact">
        <li>
          <Mail className="h-4 w-4" aria-hidden="true" />
          <a href={`mailto:${client.email}`}>{client.email}</a>
        </li>
        {client.phone ? (
          <li>
            <Phone className="h-4 w-4" aria-hidden="true" />
            <a href={`tel:${client.phone}`}>{client.phone}</a>
          </li>
        ) : null}
      </ul>

      <div className="service-clients__notes">
        <label htmlFor={`client-notes-${client.id}`} className="service-clients__notes-label">
          Notes internes
        </label>
        <textarea
          id={`client-notes-${client.id}`}
          className="service-clients__notes-input"
          rows={4}
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

      <section className="service-clients__history-block">
        <h4 className="service-clients__history-title">Historique rendez-vous</h4>
        <ClientBookingHistory bookings={clientBookings} />
      </section>
    </div>
  )
}
