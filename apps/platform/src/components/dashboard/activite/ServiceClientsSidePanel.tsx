'use client'

import { Users } from 'lucide-react'
import type { ServiceClientView } from '@/lib/service-client-view'
import { ActiviteClientAvatar } from './ActiviteClientAvatar'

function formatClientDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ClientRow({
  client,
  selected,
  onSelect,
}: {
  client: ServiceClientView
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
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
            <span className="boutique-order-card__when">
              {formatClientDate(client.lastBookingAt)}
            </span>
          </div>
        </div>
      </button>
    </li>
  )
}

type Props = {
  clients: ServiceClientView[]
  selectedClientId?: string | null
  onSelectClient: (clientId: string) => void
}

export function ServiceClientsSidePanel({
  clients,
  selectedClientId = null,
  onSelectClient,
}: Props) {
  return (
    <div className="boutique-side-products service-side-clients">
      <header className="boutique-side-products__head">
        <p className="boutique-side-products__subtitle">
          {clients.length > 0
            ? `${clients.length} client${clients.length > 1 ? 's' : ''}`
            : 'Aucun client enregistré'}
        </p>
      </header>

      <div className="boutique-side-products__body">
        {clients.length === 0 ? (
          <div className="boutique-side-products__empty">
            <Users className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Les clients apparaissent après une première réservation.</p>
          </div>
        ) : (
          <ul className="boutique-inbox__list">
            {clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                selected={selectedClientId === client.id}
                onSelect={() => onSelectClient(client.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
