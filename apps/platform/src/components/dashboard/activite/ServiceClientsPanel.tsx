'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Users } from 'lucide-react'
import { updateClientNotesAction } from '@/app/dashboard/service-actions'
import {
  formatBookingSlot,
  type ServiceBookingView,
  type ServiceDashboardData,
} from '@/lib/service-booking-view'
import { searchServiceClients, type ServiceClientView } from '@/lib/service-client-view'
import { BookingStatusBadge } from './service-booking-ui'
import { ActiviteClientAvatar } from './ActiviteClientAvatar'

type Props = {
  data: ServiceDashboardData
}

function formatClientDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ClientCard({
  client,
  selected,
  onSelect,
}: {
  client: ServiceClientView
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`boutique-order-card boutique-order-card--media${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <ActiviteClientAvatar name={client.name} />
      <div className="boutique-order-card__body">
        <div className="boutique-order-card__top">
          <span className="boutique-order-card__ref">{client.name}</span>
          <span className="boutique-order-card__type">{client.bookingsCount} RDV</span>
        </div>
        <p className="boutique-order-card__customer">{client.email}</p>
        {client.phone ? <p className="boutique-order-card__product">{client.phone}</p> : null}
        <div className="boutique-order-card__footer">
          <span className="boutique-order-card__amount">{client.totalRevenueLabel ?? '—'}</span>
          <span className="boutique-order-card__time">
            {formatClientDate(client.lastBookingAt)}
          </span>
        </div>
      </div>
    </button>
  )
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

export function ServiceClientsPanel({ data }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [, startTransition] = useTransition()
  const router = useRouter()

  const visibleClients = useMemo(
    () => searchServiceClients(data.clients, searchQuery),
    [data.clients, searchQuery],
  )

  useEffect(() => {
    if (visibleClients.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !visibleClients.some((client) => client.id === selectedId)) {
      setSelectedId(visibleClients[0].id)
    }
  }, [visibleClients, selectedId])

  const selectedClient = data.clients.find((client) => client.id === selectedId) ?? null

  useEffect(() => {
    setNotesDraft(selectedClient?.notes ?? '')
    setSaveState('idle')
  }, [selectedClient?.id, selectedClient?.notes])

  const clientBookings = useMemo(() => {
    if (!selectedClient) return []
    const email = selectedClient.email.toLowerCase()
    return data.bookings
      .filter((booking) => booking.email.toLowerCase() === email)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
  }, [data.bookings, selectedClient])

  function saveNotes() {
    if (!selectedClient) return
    setSaveState('saving')
    startTransition(async () => {
      const result = await updateClientNotesAction(selectedClient.id, notesDraft.trim() || null)
      setSaveState(result.ok ? 'saved' : 'error')
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className="boutique-inbox service-clients">
      <div className="boutique-inbox__file">
        <header className="boutique-inbox__file-head">
          <h2 className="boutique-inbox__file-title">Clients</h2>
          <span className="boutique-inbox__file-count">
            {visibleClients.length} client{visibleClients.length > 1 ? 's' : ''}
          </span>
        </header>

        <label className="service-clients__search">
          <span className="sr-only">Rechercher un client</span>
          <input
            type="search"
            className="service-clients__search-input"
            placeholder="Nom, email, téléphone…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        {visibleClients.length === 0 ? (
          <p className="boutique-inbox__empty">
            {searchQuery.trim()
              ? 'Aucun résultat pour cette recherche.'
              : 'Les clients apparaissent après une première réservation.'}
          </p>
        ) : (
          <ul className="boutique-inbox__list boutique-inbox__list--flat">
            {visibleClients.map((client) => (
              <li key={client.id}>
                <ClientCard
                  client={client}
                  selected={selectedId === client.id}
                  onSelect={() => setSelectedId(client.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="boutique-inbox__detail">
        {selectedClient ? (
          <div className="service-clients__detail">
            <header className="service-clients__detail-head service-clients__detail-head--media">
              <ActiviteClientAvatar
                name={selectedClient.name}
                className="activite-client-avatar--detail"
              />
              <div>
                <h3 className="service-clients__detail-name">{selectedClient.name}</h3>
                <p className="service-clients__detail-meta">
                  {selectedClient.bookingsCount} rendez-vous
                  {selectedClient.totalRevenueLabel
                    ? ` · ${selectedClient.totalRevenueLabel} cumulés`
                    : ''}
                </p>
              </div>
            </header>

            <ul className="service-clients__contact">
              <li>
                <Mail className="h-4 w-4" aria-hidden="true" />
                <a href={`mailto:${selectedClient.email}`}>{selectedClient.email}</a>
              </li>
              {selectedClient.phone ? (
                <li>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <a href={`tel:${selectedClient.phone}`}>{selectedClient.phone}</a>
                </li>
              ) : null}
            </ul>

            <div className="service-clients__notes">
              <label htmlFor="client-notes" className="service-clients__notes-label">
                Notes internes
              </label>
              <textarea
                id="client-notes"
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
        ) : (
          <div className="boutique-inbox__detail-empty">
            <Users className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Sélectionne un client pour voir le détail.</p>
          </div>
        )}
      </aside>
    </div>
  )
}
