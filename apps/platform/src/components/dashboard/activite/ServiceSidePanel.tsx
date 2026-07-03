'use client'

import { useState } from 'react'
import { Activity, CalendarClock, Users } from 'lucide-react'
import type { ServiceBookingView } from '@/lib/service-booking-view'
import type { ServiceCatalogLine } from '@/lib/service-catalog-view'
import type { ServiceClientView } from '@/lib/service-client-view'
import { ServiceActivityFeed } from './ServiceActivityFeed'
import { ServiceClientsSidePanel } from './ServiceClientsSidePanel'
import { ServiceServicesPanel } from './ServiceServicesPanel'

type Tab = 'activity' | 'services' | 'clients'

type Props = {
  bookings: ServiceBookingView[]
  services: ServiceCatalogLine[]
  clients: ServiceClientView[]
  selectedClientId?: string | null
  onSelectBooking: (bookingId: string) => void
  onSelectClient: (clientId: string) => void
}

export function ServiceSidePanel({
  bookings,
  services,
  clients,
  selectedClientId = null,
  onSelectBooking,
  onSelectClient,
}: Props) {
  const [tab, setTab] = useState<Tab>('activity')

  return (
    <div className="boutique-side-panel">
      <nav className="boutique-side-panel__nav" aria-label="Panneau service">
        <button
          type="button"
          className={`boutique-side-panel__tab${tab === 'activity' ? ' is-active' : ''}`}
          onClick={() => setTab('activity')}
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          Activité récente
        </button>
        <button
          type="button"
          className={`boutique-side-panel__tab${tab === 'services' ? ' is-active' : ''}`}
          onClick={() => setTab('services')}
        >
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Services
        </button>
        <button
          type="button"
          className={`boutique-side-panel__tab${tab === 'clients' ? ' is-active' : ''}`}
          onClick={() => setTab('clients')}
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Clients
        </button>
      </nav>

      <div className="boutique-side-panel__content">
        {tab === 'activity' ? (
          <ServiceActivityFeed bookings={bookings} onSelectBooking={onSelectBooking} />
        ) : tab === 'services' ? (
          <ServiceServicesPanel services={services} />
        ) : (
          <ServiceClientsSidePanel
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={onSelectClient}
          />
        )}
      </div>
    </div>
  )
}
