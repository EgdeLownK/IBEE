'use client'

import {
  ArrowDownUp,
  CircleCheck,
  Clock,
  LayoutGrid,
  Package,
  Search,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import {
  BOUTIQUE_ORDER_FILTERS,
  type BoutiqueOrderFilter,
} from '@/lib/boutique-order-view'

const BOUTIQUE_FILTER_ICONS: Record<BoutiqueOrderFilter, LucideIcon> = {
  'to-treat': Clock,
  ready: Package,
  shipping: Truck,
  trial: CircleCheck,
  returns: ArrowDownUp,
  all: LayoutGrid,
}

type Props = {
  activeFilter: BoutiqueOrderFilter
  searchQuery: string
  onFilterChange: (filter: BoutiqueOrderFilter) => void
  onSearchChange: (query: string) => void
}

export function BoutiqueSignalsBand({
  activeFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: Props) {
  return (
    <section className="boutique-signals" aria-label="Filtres commandes">
      <div className="boutique-signals__top">
        <label className="boutique-signals__search">
          <Search className="boutique-signals__search-icon" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher une commande, un client…"
            className="boutique-signals__search-input"
            aria-label="Rechercher une commande"
          />
        </label>
      </div>

      <div className="boutique-signals__pills" role="tablist" aria-label="Filtres par statut">
        {BOUTIQUE_ORDER_FILTERS.map((filter) => {
          const Icon = BOUTIQUE_FILTER_ICONS[filter.id]
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              className={`boutique-signals__pill${activeFilter === filter.id ? ' is-active' : ''}`}
              onClick={() => onFilterChange(filter.id)}
            >
              <Icon className="boutique-signals__pill-icon" aria-hidden="true" />
              {filter.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
