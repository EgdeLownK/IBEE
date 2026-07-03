'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, Plus } from 'lucide-react'
import type { ServiceDashboardData } from '@/lib/service-booking-view'
import { useActivityOverlay } from './ActivityOverlayProvider'
import { ServiceInboxPanel } from './ServiceInboxPanel'
import { ServicePlanningPanel } from './ServicePlanningPanel'

type Props = {
  data: ServiceDashboardData
}

type ServiceTab = 'inbox' | 'planning'

function serviceDateLine() {
  const today = new Date()
  const dayName = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const month = today.toLocaleDateString('fr-FR', { month: 'long' })
  const label = `${dayName} ${today.getDate()} ${month}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function ServiceDashboard({ data }: Props) {
  const { openOverlay } = useActivityOverlay()
  const [tab, setTab] = useState<ServiceTab>('inbox')
  const dateLine = useMemo(() => serviceDateLine(), [])

  return (
    <div className="activite-page boutique-dash service-dash">
      <header className="boutique-dash__head">
        <div className="boutique-dash__head-main service-dash__head-main">
          <h1 className="boutique-dash__title">Service</h1>
          <p className="boutique-dash__subtitle">
            {dateLine}
            {data.today.pendingCount > 0
              ? ` · ${data.today.pendingCount} à confirmer`
              : ' · rien en attente'}
          </p>
          <div className="service-dash__tabs" role="tablist" aria-label="Sections service">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'inbox'}
              className={`service-dash__tab${tab === 'inbox' ? ' is-active' : ''}`}
              onClick={() => setTab('inbox')}
            >
              Rendez-vous
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'planning'}
              className={`service-dash__tab${tab === 'planning' ? ' is-active' : ''}`}
              onClick={() => setTab('planning')}
            >
              Disponibilités
            </button>
          </div>
        </div>
        <div className="boutique-dash__head-actions">
          <button
            type="button"
            className="boutique-dash__head-btn"
            onClick={() => openOverlay('service')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un service
          </button>
          <button
            type="button"
            className="boutique-dash__head-btn boutique-dash__head-btn--primary"
            onClick={() => openOverlay('booking')}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Ajouter un rendez-vous
          </button>
        </div>
      </header>

      {tab === 'inbox' ? (
        <div className="boutique-dash__workspace">
          <ServiceInboxPanel data={data} />
        </div>
      ) : (
        <div className="boutique-dash__workspace">
          <ServicePlanningPanel data={data} />
        </div>
      )}
    </div>
  )
}
