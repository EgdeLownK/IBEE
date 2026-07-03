'use client'

import { useMemo, useState } from 'react'
import { Plus, ShoppingBag } from 'lucide-react'
import {
  buildBoutiqueKpis,
  type BoutiqueDashboardData,
  type BoutiqueOrderFilter,
} from '@/lib/boutique-order-view'
import { getActivityModuleLabel } from '@/lib/activity-modules'
import { useActivityOverlay } from './ActivityOverlayProvider'
import { BoutiqueInboxPanel } from './BoutiqueInboxPanel'
import { BoutiqueSignalsBand } from './BoutiqueSignalsBand'

type Props = {
  data: BoutiqueDashboardData
  senderName: string
}

function boutiqueDateLine() {
  const today = new Date()
  const dayName = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const month = today.toLocaleDateString('fr-FR', { month: 'long' })
  const label = `${dayName} ${today.getDate()} ${month}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function BoutiqueDashboard({ data, senderName }: Props) {
  const { openOverlay } = useActivityOverlay()
  const [orderFilter, setOrderFilter] = useState<BoutiqueOrderFilter>('to-treat')
  const [searchQuery, setSearchQuery] = useState('')
  const dateLine = useMemo(() => boutiqueDateLine(), [])
  const kpis = useMemo(() => buildBoutiqueKpis(data.orders), [data.orders])

  return (
    <div className="activite-page boutique-dash">
      <header className="boutique-dash__head">
        <div className="boutique-dash__head-main">
          <h1 className="boutique-dash__title">{getActivityModuleLabel('shop')}</h1>
          <p className="boutique-dash__subtitle">
            {dateLine}
            {kpis.toTreatCount > 0
              ? ` · ${kpis.toTreatCount} à traiter`
              : ' · rien en attente'}
          </p>
        </div>
        <div className="boutique-dash__head-actions">
          <button
            type="button"
            className="boutique-dash__head-btn"
            onClick={() => openOverlay('product')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un produit
          </button>
          <button
            type="button"
            className="boutique-dash__head-btn boutique-dash__head-btn--primary"
            onClick={() => openOverlay('order')}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Créer une commande
          </button>
        </div>
      </header>

      <BoutiqueSignalsBand
        activeFilter={orderFilter}
        searchQuery={searchQuery}
        onFilterChange={setOrderFilter}
        onSearchChange={setSearchQuery}
      />

      <div className="boutique-dash__workspace">
        <BoutiqueInboxPanel
          data={data}
          orderFilter={orderFilter}
          searchQuery={searchQuery}
          senderName={senderName}
        />
      </div>
    </div>
  )
}
