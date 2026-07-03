'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BoutiqueHistoriquePanel } from './boutique-orders-ui'
import type { BoutiqueOrderView } from '@/lib/boutique-order-view'

type Props = {
  orders: BoutiqueOrderView[]
}

export function BoutiqueHistoryCollapsible({ orders }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className={`boutique-history${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="boutique-history__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="boutique-history__toggle-label">
          Historique des commandes
          <span className="boutique-history__toggle-count">
            {orders.length} commande{orders.length > 1 ? 's' : ''}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="boutique-history__body">
          <BoutiqueHistoriquePanel orders={orders} embedded />
        </div>
      ) : null}
    </section>
  )
}
