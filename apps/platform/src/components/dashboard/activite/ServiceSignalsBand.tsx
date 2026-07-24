'use client'

import { Search } from 'lucide-react'
import {
  countServiceBookingsByFilter,
  SERVICE_BOOKING_FILTERS,
  type ServiceBookingFilter,
  type ServiceBookingView,
  type ServiceTodaySnapshot,
} from '@/lib/service-booking-view'

type Props = {
  bookings: ServiceBookingView[]
  today: ServiceTodaySnapshot
  activeFilter: ServiceBookingFilter
  searchQuery: string
  onFilterChange: (filter: ServiceBookingFilter) => void
  onSearchChange: (query: string) => void
}

export function ServiceSignalsBand({
  bookings,
  today,
  activeFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: Props) {
  return (
    <section className="boutique-signals" aria-label="Filtres rendez-vous">
      <div className="boutique-signals__top">
        <label className="boutique-signals__search">
          <Search className="boutique-signals__search-icon" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un client, une prestation…"
            className="boutique-signals__search-input"
            aria-label="Rechercher un rendez-vous"
          />
        </label>
        <p className="boutique-signals__revenue">
          {today.todayCount > 0 ? (
            <>
              <span className="boutique-signals__revenue-amount">{today.todayCount}</span>{' '}
              aujourd&apos;hui
              {today.upcomingCount > 0 ? ` · ${today.upcomingCount} à venir` : ''}
            </>
          ) : (
            <span className="boutique-signals__revenue--muted">
              Aucun rendez-vous aujourd&apos;hui
            </span>
          )}
        </p>
      </div>

      <div className="boutique-signals__pills" role="tablist" aria-label="Filtres par statut">
        {SERVICE_BOOKING_FILTERS.map((filter) => {
          const count = countServiceBookingsByFilter(bookings, filter.id)
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              className={`boutique-signals__pill${activeFilter === filter.id ? ' is-active' : ''}`}
              onClick={() => onFilterChange(filter.id)}
            >
              <span className="boutique-signals__pill-count">{count}</span>
              {filter.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
