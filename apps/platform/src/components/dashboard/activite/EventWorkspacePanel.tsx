'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ban,
  CalendarDays,
  Download,
  Pencil,
  QrCode,
  Search,
  UserPlus,
  X,
} from 'lucide-react'
import { cancelRegistrationAction, banClientAction, unbanClientAction } from '@/app/dashboard/activite/billetterie-actions'
import type { LoadedBilletterieDashboard } from '@/lib/load-billetterie-data'
import type { BilletterieEventLine, EventFeedSegment } from '@/lib/event-catalog-view'
import {
  findBannedClientByEmail,
  isEmailBanned,
  searchBannedClients,
} from '@/lib/banned-client-view'
import {
  formatEventCapacityLabel,
  formatEventCardDate,
  formatEventCardTime,
  formatEventCountdownLabel,
  formatEventRevenue,
  EVENT_FEED_SECTION_LABELS,
  EVENT_UPCOMING_SUBSECTION_LABELS,
  getEventFeedSegment,
  getEventUpcomingSubsegment,
  getEventCapacityState,
  searchEventLines,
  sortEventLinesForFeed,
} from '@/lib/event-catalog-view'
import {
  registrationsToCsv,
  searchBilletterieRegistrations,
  isFirstTimeParticipant,
  type BilletterieRegistrationView,
} from '@/lib/billetterie-registration-view'
import { isEventRootPlace } from '@/lib/event-place-view'
import { useActivityOverlay } from './ActivityOverlayProvider'
import {
  BannedClientCard,
  BannedClientDetail,
  ParticipantCard,
  RegistrationDetail,
  RegistrationStatusBadge,
} from './billetterie-registration-ui'
import { EventPlacesPanel } from './EventPlacesPanel'
import { EventPlacePicker } from './EventPlacePicker'
import { ActiviteCatalogThumb } from './ActiviteCatalogThumb'

type Props = {
  data: LoadedBilletterieDashboard
}

type ParticipantFilter = 'all' | 'confirmed' | 'cancelled' | 'banned'
type EventWorkspaceTab = 'participants' | 'places'

type EventFeedFilter = EventFeedSegment

const EVENT_FEED_FILTERS: ReadonlyArray<{ id: EventFeedFilter; label: string }> = [
  { id: 'upcoming', label: EVENT_FEED_SECTION_LABELS.upcoming },
  { id: 'past', label: EVENT_FEED_SECTION_LABELS.past },
]

function EventListCard({
  event,
  selected,
  onSelect,
}: {
  event: BilletterieEventLine
  selected: boolean
  onSelect: () => void
}) {
  const capacity = getEventCapacityState(event)
  const cardDate = formatEventCardDate(event.startAt)
  const countdownLabel = formatEventCountdownLabel(event.startAt)

  return (
    <button
      type="button"
      className={`event-list-card${selected ? ' is-selected' : ''}${event.isToday ? ' is-today' : ''}${capacity.isSoldOut ? ' is-sold-out' : ''}${capacity.isLowCapacity ? ' is-low-capacity' : ''}`}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="event-list-card__date" aria-hidden="true">
        <span className="event-list-card__date-day">{cardDate.day}</span>
        <span className="event-list-card__date-month">{cardDate.month}</span>
      </div>
      <ActiviteCatalogThumb imageUrl={event.imageUrl} alt="" />
      <div className="event-list-card__body">
        <div className="event-list-card__top">
          <span className="event-list-card__title">{event.title}</span>
          <div className="event-list-card__badges">
            {countdownLabel ? (
              <span className="event-list-card__countdown">{countdownLabel}</span>
            ) : null}
            <span className={`event-list-card__format is-${event.locationType}`}>
              {event.locationLabel}
            </span>
            {capacity.isSoldOut ? <span className="event-list-card__sold-out">Complet</span> : null}
            {capacity.isLowCapacity ? (
              <span className="event-list-card__low">Peu de places</span>
            ) : null}
          </div>
        </div>
        <p className="event-list-card__slot">
          {formatEventCardTime(event.startAt, event.endAt)}
        </p>
        {capacity.hasCapacity ? (
          <div className="event-list-card__capacity">
            <div className="event-list-card__capacity-bar" aria-hidden="true">
              <span
                className="event-list-card__capacity-fill"
                style={{ width: `${Math.round((capacity.fillRatio ?? 0) * 100)}%` }}
              />
            </div>
            <span className="event-list-card__capacity-label">{formatEventCapacityLabel(event)}</span>
          </div>
        ) : (
          <p className="event-list-card__count">{formatEventCapacityLabel(event)}</p>
        )}
      </div>
    </button>
  )
}

function filterParticipants(
  registrations: BilletterieRegistrationView[],
  eventId: string,
  statusFilter: ParticipantFilter,
  searchQuery: string,
  activityId: string | null
): BilletterieRegistrationView[] {
  let list = registrations.filter((reg) => reg.eventId === eventId)
  if (activityId) list = list.filter((reg) => reg.activityId === activityId)
  if (statusFilter === 'confirmed') list = list.filter((reg) => reg.status === 'confirmed')
  if (statusFilter === 'cancelled') list = list.filter((reg) => reg.status === 'cancelled')
  return searchBilletterieRegistrations(list, searchQuery).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function EventWorkspacePanel({ data }: Props) {
  const { openOverlay, openEventEdit, openAddParticipant } = useActivityOverlay()
  const sortedEvents = useMemo(() => sortEventLinesForFeed(data.eventLines), [data.eventLines])
  const [eventSearchQuery, setEventSearchQuery] = useState('')
  const [eventFeedFilter, setEventFeedFilter] = useState<EventFeedFilter>('upcoming')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [selectedBannedId, setSelectedBannedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ParticipantFilter>('all')
  const [activityFilterId, setActivityFilterId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<EventWorkspaceTab>('participants')
  const [participantSearchQuery, setParticipantSearchQuery] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const searchedEvents = useMemo(
    () => searchEventLines(sortedEvents, eventSearchQuery),
    [sortedEvents, eventSearchQuery]
  )

  const visibleEvents = useMemo(
    () => searchedEvents.filter((event) => getEventFeedSegment(event) === eventFeedFilter),
    [searchedEvents, eventFeedFilter]
  )

  useEffect(() => {
    if (visibleEvents.length === 0) {
      setSelectedEventId(null)
      return
    }
    if (!selectedEventId || !visibleEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(visibleEvents[0].id)
    }
  }, [visibleEvents, selectedEventId])

  const selectedEvent =
    sortedEvents.find((event) => event.id === selectedEventId) ?? null

  const eventPlaces = useMemo(
    () => (selectedEventId ? data.activitiesByEventId[selectedEventId] ?? [] : []),
    [data.activitiesByEventId, selectedEventId]
  )

  const participantPlaces = useMemo(
    () => eventPlaces.filter((place) => !isEventRootPlace(place)),
    [eventPlaces]
  )

  const hasPlaces = eventPlaces.length > 0
  const hasMultiplePlaces = participantPlaces.length > 1
  const hideParticipantStatusFilters = hasMultiplePlaces

  useEffect(() => {
    if (!selectedEventId || participantPlaces.length <= 1) {
      setActivityFilterId(null)
    }
  }, [selectedEventId, participantPlaces.length])

  useEffect(() => {
    if (hasMultiplePlaces && statusFilter === 'banned') {
      setStatusFilter('all')
    }
  }, [hasMultiplePlaces, selectedEventId, statusFilter])

  const showPlacePicker = hasMultiplePlaces && detailTab === 'participants'
  const showParticipantsForPlace =
    !hasMultiplePlaces || activityFilterId != null

  const selectedPlace =
    hasMultiplePlaces && activityFilterId
      ? (participantPlaces.find((place) => place.id === activityFilterId) ?? null)
      : null
  const participants = useMemo(() => {
    if (!showParticipantsForPlace) return []
    if (!selectedEventId || statusFilter === 'banned') return []
    return filterParticipants(
      data.registrations,
      selectedEventId,
      statusFilter,
      participantSearchQuery,
      hasMultiplePlaces ? activityFilterId : null
    )
  }, [
    data.registrations,
    selectedEventId,
    statusFilter,
    participantSearchQuery,
    activityFilterId,
    hasMultiplePlaces,
    showParticipantsForPlace,
  ])

  const bannedClients = useMemo(
    () => searchBannedClients(data.bannedClients, participantSearchQuery),
    [data.bannedClients, participantSearchQuery]
  )

  useEffect(() => {
    if (!selectedParticipantId) return
    if (!participants.some((reg) => reg.id === selectedParticipantId)) {
      setSelectedParticipantId(null)
    }
  }, [participants, selectedParticipantId])

  useEffect(() => {
    if (!selectedBannedId) return
    if (!bannedClients.some((client) => client.id === selectedBannedId)) {
      setSelectedBannedId(null)
    }
  }, [bannedClients, selectedBannedId])

  const selectedParticipant =
    data.registrations.find((reg) => reg.id === selectedParticipantId) ?? null

  const selectedBannedClient =
    data.bannedClients.find((client) => client.id === selectedBannedId) ?? null

  const selectedParticipantBanned = selectedParticipant
    ? isEmailBanned(data.bannedClients, selectedParticipant.attendeeEmail)
    : false

  const selectedParticipantBannedClient = selectedParticipant
    ? findBannedClientByEmail(data.bannedClients, selectedParticipant.attendeeEmail)
    : null

  const participantEntreeHref = selectedEvent
    ? `/${data.entitySlug}/events/${selectedEvent.slug}/entree`
    : null

  function selectEvent(eventId: string) {
    setSelectedEventId(eventId)
    setSelectedParticipantId(null)
    setSelectedBannedId(null)
    setParticipantSearchQuery('')
    setStatusFilter('all')
    setActivityFilterId(null)
    setDetailTab('participants')
  }

  function changeDetailTab(tab: EventWorkspaceTab) {
    setDetailTab(tab)
    setSelectedParticipantId(null)
    setSelectedBannedId(null)
  }

  function changeActivityFilter(activityId: string | null) {
    setActivityFilterId(activityId)
    setSelectedParticipantId(null)
    setSelectedBannedId(null)
  }

  function changeStatusFilter(filter: ParticipantFilter) {
    setStatusFilter(filter)
    setSelectedParticipantId(null)
    setSelectedBannedId(null)
  }

  function runCancel(registrationId: string) {
    setActionId(registrationId)
    startTransition(async () => {
      await cancelRegistrationAction(registrationId)
      setActionId(null)
      setSelectedParticipantId(null)
      router.refresh()
    })
  }

  function runBan(registration: BilletterieRegistrationView) {
    setActionId(registration.id)
    startTransition(async () => {
      await banClientAction({
        email: registration.attendeeEmail,
        name: registration.attendeeName,
        phone: registration.attendeePhone,
      })
      setActionId(null)
      router.refresh()
    })
  }

  function runUnban(clientId: string) {
    setActionId(clientId)
    startTransition(async () => {
      await unbanClientAction(clientId)
      setActionId(null)
      setSelectedBannedId(null)
      setSelectedParticipantId(null)
      router.refresh()
    })
  }

  function exportCsv() {
    if (participants.length === 0) return
    const csv = registrationsToCsv(participants)
    const slug = selectedEvent?.slug ?? 'event'
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `participants-${slug}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="boutique-inbox event-workspace">
      <div className="boutique-inbox__file">
        {selectedBannedClient ? (
          <div className="event-workspace__file-participant">
            <BannedClientDetail
              client={selectedBannedClient}
              compact
              onClose={() => setSelectedBannedId(null)}
            />
            <div className="boutique-inbox__quick-action boutique-inbox__quick-action--stack">
              <button
                type="button"
                className="boutique-inbox__action-btn boutique-inbox__action-btn--ghost"
                disabled={actionId === selectedBannedClient.id}
                onClick={() => runUnban(selectedBannedClient.id)}
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                {actionId === selectedBannedClient.id ? '…' : 'Débannir'}
              </button>
            </div>
          </div>
        ) : selectedParticipant ? (
          <div className="event-workspace__file-participant">
            <RegistrationDetail
              registration={selectedParticipant}
              compact
              onClose={() => setSelectedParticipantId(null)}
            />
            <div className="boutique-inbox__quick-action boutique-inbox__quick-action--stack">
              {selectedParticipant.status === 'confirmed' ? (
                <button
                  type="button"
                  className="boutique-inbox__action-btn boutique-inbox__action-btn--ghost"
                  disabled={actionId === selectedParticipant.id}
                  onClick={() => runCancel(selectedParticipant.id)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {actionId === selectedParticipant.id ? '…' : 'Annuler l’inscription'}
                </button>
              ) : (
                <RegistrationStatusBadge status={selectedParticipant.status} />
              )}
              {selectedParticipantBanned && selectedParticipantBannedClient ? (
                <button
                  type="button"
                  className="boutique-inbox__action-btn boutique-inbox__action-btn--ghost"
                  disabled={actionId === selectedParticipantBannedClient.id}
                  onClick={() => runUnban(selectedParticipantBannedClient.id)}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  {actionId === selectedParticipantBannedClient.id ? '…' : 'Débannir ce client'}
                </button>
              ) : (
                <button
                  type="button"
                  className="boutique-inbox__action-btn boutique-inbox__action-btn--danger"
                  disabled={actionId === selectedParticipant.id}
                  onClick={() => runBan(selectedParticipant)}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  {actionId === selectedParticipant.id ? '…' : 'Bannir ce client'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
        <header className="boutique-inbox__file-head">
          <div className="boutique-inbox__file-head-main">
            <h2 className="boutique-inbox__file-title">Événements</h2>
            <span className="boutique-inbox__file-count">
              {visibleEvents.length} événement{visibleEvents.length > 1 ? 's' : ''}
              {eventSearchQuery.trim() && visibleEvents.length !== sortedEvents.length
                ? ` · ${sortedEvents.length} au total`
                : ''}
            </span>
          </div>
        </header>

        {sortedEvents.length > 0 ? (
          <div className="event-workspace__events-toolbar">
            <label className="event-workspace__search">
              <Search className="event-workspace__search-icon" aria-hidden="true" />
              <input
                type="search"
                value={eventSearchQuery}
                onChange={(event) => setEventSearchQuery(event.target.value)}
                placeholder="Rechercher un événement…"
                className="event-workspace__search-input"
                aria-label="Rechercher un événement"
              />
            </label>
            <div
              className="event-workspace__filters event-workspace__events-filters"
              role="tablist"
              aria-label="Filtrer les événements"
            >
              {EVENT_FEED_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={eventFeedFilter === id}
                  className={`event-workspace__filter${eventFeedFilter === id ? ' is-active' : ''}`}
                  onClick={() => setEventFeedFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {sortedEvents.length === 0 ? (
          <p className="boutique-inbox__empty">
            Aucun événement pour le moment.{' '}
            <button
              type="button"
              className="service-dash__planning-link"
              onClick={() => openOverlay('event')}
            >
              Créer un événement
            </button>
          </p>
        ) : visibleEvents.length === 0 ? (
          <p className="boutique-inbox__empty">
            {eventSearchQuery.trim()
              ? 'Aucun événement pour cette recherche.'
              : eventFeedFilter === 'upcoming'
                ? 'Aucun événement à venir.'
                : 'Aucun événement passé.'}
          </p>
        ) : (
          <ul className="boutique-inbox__list boutique-inbox__list--flat event-workspace__event-feed">
            {visibleEvents.flatMap((event, index) => {
              const items = []

              if (eventFeedFilter === 'upcoming') {
                const subsegment = getEventUpcomingSubsegment(event)
                const prevSubsegment =
                  index > 0
                    ? getEventUpcomingSubsegment(visibleEvents[index - 1])
                    : null

                if (index === 0 || subsegment !== prevSubsegment) {
                  items.push(
                    <li
                      key={`event-subsection-${subsegment}-${event.id}`}
                      className="event-feed__section"
                    >
                      <span className="event-feed__section-tag">
                        {EVENT_UPCOMING_SUBSECTION_LABELS[subsegment]}
                      </span>
                    </li>
                  )
                }
              }

              items.push(
                <li key={event.id}>
                  <EventListCard
                    event={event}
                    selected={selectedEventId === event.id}
                    onSelect={() => selectEvent(event.id)}
                  />
                </li>
              )

              return items
            })}
          </ul>
        )}
          </>
        )}
      </div>

      <aside
        className={`boutique-inbox__detail event-workspace__participants${selectedEvent ? ' boutique-inbox__detail--order' : ''}`}
      >
        {!selectedEvent ? (
          <div className="boutique-inbox__detail-empty">
            <CalendarDays className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Sélectionne un événement pour voir ses participants.</p>
          </div>
        ) : (
          <>
            <header
              className={`event-workspace__head${hasPlaces ? ' event-workspace__head--flush-tabs' : ''}`}
            >
              <div className="event-workspace__head-main">
                <h2 className="event-workspace__title">{selectedEvent.title}</h2>
                <p className="event-workspace__meta">{selectedEvent.slotLabel}</p>
                <p className="event-workspace__stats">
                  {formatEventCapacityLabel(selectedEvent)}
                  {selectedEvent.checkedInCount > 0
                    ? ` · ${selectedEvent.checkedInCount} entrée${selectedEvent.checkedInCount > 1 ? 's' : ''}`
                    : ''}
                  {selectedEvent.revenueCents > 0
                    ? ` · ${formatEventRevenue(selectedEvent.revenueCents)}`
                    : ''}
                </p>
                {getEventCapacityState(selectedEvent).hasCapacity ? (
                  <div className="event-workspace__capacity">
                    <div className="event-list-card__capacity-bar" aria-hidden="true">
                      <span
                        className="event-list-card__capacity-fill"
                        style={{
                          width: `${Math.round((getEventCapacityState(selectedEvent).fillRatio ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="event-workspace__head-actions">
                <button
                  type="button"
                  className="event-workspace__icon-btn"
                  aria-label="Ajouter un participant"
                  onClick={() => openAddParticipant(selectedEvent.id)}
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                {participantEntreeHref ? (
                  <Link
                    href={participantEntreeHref}
                    className="event-workspace__icon-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="QR code entrée participants"
                  >
                    <QrCode className="h-4 w-4" />
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="event-workspace__icon-btn"
                  aria-label="Modifier l'événement"
                  onClick={() => openEventEdit(selectedEvent.id)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </header>

            {hasPlaces ? (
              <div className="event-workspace__tabs" role="tablist" aria-label="Sections événement">
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'participants'}
                  className={
                    detailTab === 'participants'
                      ? 'event-workspace__tab is-active'
                      : 'event-workspace__tab'
                  }
                  onClick={() => changeDetailTab('participants')}
                >
                  Participants
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'places'}
                  className={
                    detailTab === 'places' ? 'event-workspace__tab is-active' : 'event-workspace__tab'
                  }
                  onClick={() => changeDetailTab('places')}
                >
                  Places
                </button>
              </div>
            ) : null}

            {detailTab === 'places' && hasPlaces ? (
              <EventPlacesPanel eventId={selectedEvent.id} places={eventPlaces} />
            ) : (
              <>
            <div className="event-workspace__toolbar">
              <label className="event-workspace__search">
                <Search className="event-workspace__search-icon" aria-hidden="true" />
                <input
                  type="search"
                  value={participantSearchQuery}
                  onChange={(event) => setParticipantSearchQuery(event.target.value)}
                  placeholder="Rechercher un participant…"
                  className="event-workspace__search-input"
                  aria-label="Rechercher un participant"
                />
              </label>
              {!hideParticipantStatusFilters ? (
                <div className="event-workspace__filters" role="tablist" aria-label="Filtrer les participants">
                  {(
                    [
                      ['all', 'Tous'],
                      ['confirmed', 'Confirmés'],
                      ['cancelled', 'Annulés'],
                      ['banned', 'Bannis'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === id}
                      className={`event-workspace__filter${statusFilter === id ? ' is-active' : ''}`}
                      onClick={() => changeStatusFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {showPlacePicker ? (
              <EventPlacePicker
                places={participantPlaces}
                selectedPlaceId={activityFilterId}
                onSelectPlace={changeActivityFilter}
              />
            ) : null}

            {showPlacePicker && !activityFilterId ? (
              <p className="event-workspace__empty">
                Sélectionne un type de place pour afficher les participants.
              </p>
            ) : (
              <>
            <div className="event-workspace__participants-head">
              <span className="event-workspace__participants-count">
                {statusFilter === 'banned'
                  ? `${bannedClients.length} banni${bannedClients.length > 1 ? 's' : ''}`
                  : selectedPlace
                    ? `${participants.length} participant${participants.length > 1 ? 's' : ''} · ${selectedPlace.title}`
                    : `${participants.length} participant${participants.length > 1 ? 's' : ''}`}
              </span>
              {statusFilter !== 'banned' && participants.length > 0 ? (
                <button type="button" className="event-workspace__export" onClick={exportCsv}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  CSV
                </button>
              ) : null}
            </div>

            {statusFilter === 'banned' ? (
              bannedClients.length === 0 ? (
                <p className="event-workspace__empty">
                  {participantSearchQuery.trim()
                    ? 'Aucun client banni pour cette recherche.'
                    : 'Aucun client banni pour le moment.'}
                </p>
              ) : (
                <ul className="event-workspace__participants-list">
                  {bannedClients.map((client) => (
                    <li key={client.id}>
                      <BannedClientCard
                        client={client}
                        selected={selectedBannedId === client.id}
                        onSelect={() => {
                          setSelectedBannedId(client.id)
                          setSelectedParticipantId(null)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : participants.length === 0 ? (
              <p className="event-workspace__empty">
                {participantSearchQuery.trim()
                  ? 'Aucun participant pour cette recherche.'
                  : selectedPlace
                    ? `Aucun participant pour ${selectedPlace.title}.`
                    : 'Aucun participant pour cet événement.'}
              </p>
            ) : (
              <ul className="event-workspace__participants-list">
                {participants.map((registration) => (
                  <li key={registration.id}>
                    <ParticipantCard
                      registration={registration}
                      isNew={isFirstTimeParticipant(registration, data.registrations)}
                      isBanned={isEmailBanned(data.bannedClients, registration.attendeeEmail)}
                      selected={selectedParticipantId === registration.id}
                      onSelect={() => {
                        setSelectedParticipantId(registration.id)
                        setSelectedBannedId(null)
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
              </>
            )}
              </>
            )}
          </>
        )}
      </aside>
    </div>
  )
}
