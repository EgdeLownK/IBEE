'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import {
  BILLETTERIE_REGISTRATION_FILTERS,
  countBilletterieByFilter,
  type BilletterieRegistrationFilter,
  type BilletterieRegistrationView,
  type BilletterieTodaySnapshot,
} from '@/lib/billetterie-registration-view'
import { formatBoutiqueMoney } from '@/lib/boutique-order-view'
import { useCheckInMobileLayout } from './use-check-in-layout'

function TodayEventLiveLink({
  live,
}: {
  live: NonNullable<BilletterieTodaySnapshot['todayEventLive']>
}) {
  const isMobile = useCheckInMobileLayout()
  const href = `/dashboard/activite/billetterie/check-in?eventId=${live.eventId}${isMobile ? '&scan=1' : ''}`

  return (
    <Link href={href}>{live.eventTitle}</Link>
  )
}

type Props = {
  registrations: BilletterieRegistrationView[]
  today: BilletterieTodaySnapshot
  activeFilter: BilletterieRegistrationFilter
  searchQuery: string
  onFilterChange: (filter: BilletterieRegistrationFilter) => void
  onSearchChange: (query: string) => void
}

export function BilletterieSignalsBand({
  registrations,
  today,
  activeFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: Props) {
  return (
    <section className="boutique-signals" aria-label="Filtres inscriptions">
      <div className="boutique-signals__top">
        <label className="boutique-signals__search">
          <Search className="boutique-signals__search-icon" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un participant, un événement…"
            className="boutique-signals__search-input"
            aria-label="Rechercher une inscription"
          />
        </label>
        <p className="boutique-signals__revenue">
          {today.todayEventLive ? (
            <>
              <span className="boutique-signals__revenue-amount">
                {today.todayEventLive.checkedInCount}/{today.todayEventLive.confirmedCount}
              </span>{' '}
              entrées · {formatBoutiqueMoney(today.todayEventLive.revenueCents)} ·{' '}
              <TodayEventLiveLink live={today.todayEventLive} />
            </>
          ) : today.registrations7d > 0 ? (
            <>
              <span className="boutique-signals__revenue-amount">{today.registrations7d}</span>
              {' '}inscription{today.registrations7d > 1 ? 's' : ''} sur 7 jours
              {today.upcomingEventsCount > 0
                ? ` · ${today.upcomingEventsCount} événement${today.upcomingEventsCount > 1 ? 's' : ''} à venir`
                : ''}
            </>
          ) : (
            <span className="boutique-signals__revenue--muted">Aucune inscription récente</span>
          )}
        </p>
      </div>

      <div className="boutique-signals__pills" role="tablist" aria-label="Filtres par statut">
        {BILLETTERIE_REGISTRATION_FILTERS.map((filter) => {
          const count = countBilletterieByFilter(registrations, filter.id)
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
