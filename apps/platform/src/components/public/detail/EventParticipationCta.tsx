'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageCircle, Plus, X } from 'lucide-react'
import type { DefaultEventRegistration } from '@/lib/resolve-default-event-registration'

export type EventActivityOption = {
  id: string
  title: string
  slotLabel: string
  statusAvailable: boolean
  remaining: number | null
  ticketTypes: { id: string; priceCents: number; priceLabel: string }[]
}

type Props = {
  eventId: string
  entityId: string
  entitySlug: string
  eventSlug: string
  statusAvailable: boolean
  isAuthenticated: boolean
  messageEnabled: boolean
  messageHref: string
  loginHref?: string
  bookerName: string
  bookerEmail: string
  initialRegistered: boolean
  hasActivities: boolean
  activities: EventActivityOption[]
  registrationTarget: DefaultEventRegistration | null
}

function resolveTargetForActivity(activity: EventActivityOption): DefaultEventRegistration | null {
  const free = activity.ticketTypes.find((t) => t.priceCents <= 0)
  const ticket = free ?? activity.ticketTypes[0]
  if (!ticket) return null
  return {
    activityId: activity.id,
    ticketTypeId: ticket.id,
    needsPayment: ticket.priceCents > 0,
  }
}

export function EventParticipationCta({
  eventId,
  entityId,
  entitySlug,
  eventSlug,
  statusAvailable,
  isAuthenticated,
  messageEnabled,
  messageHref,
  loginHref = '/login',
  bookerName,
  bookerEmail,
  initialRegistered,
  hasActivities,
  activities,
  registrationTarget,
}: Props) {
  const [registered, setRegistered] = useState(initialRegistered)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [placeOverlayOpen, setPlaceOverlayOpen] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState('')

  const availableActivities = useMemo(
    () => activities.filter((a) => a.statusAvailable && a.ticketTypes.length > 0),
    [activities]
  )

  const needsPlacePicker = hasActivities && availableActivities.length > 1

  const defaultTarget = useMemo((): DefaultEventRegistration | null => {
    if (hasActivities) {
      if (availableActivities.length === 1) {
        return resolveTargetForActivity(availableActivities[0]!)
      }
      return null
    }
    return registrationTarget
  }, [availableActivities, hasActivities, registrationTarget])

  useEffect(() => {
    if (!placeOverlayOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPlaceOverlayOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [placeOverlayOpen])

  if (!statusAvailable) return null

  if (registered) {
    if (messageEnabled) {
      return (
        <Link href={messageHref} className="detail-entity-strip__cta detail-entity-strip__cta--dark">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Message
        </Link>
      )
    }
    return (
      <span className="detail-entity-strip__cta detail-entity-strip__cta--done" aria-disabled="true">
        Inscrit
      </span>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link href={loginHref} className="detail-entity-strip__cta">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Participer
      </Link>
    )
  }

  async function submitRegistration(target: DefaultEventRegistration | null) {
    if (submitting || !target) {
      if (!target) setError('Inscription indisponible pour cet événement.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      if (target.needsPayment) {
        if (!target.ticketTypeId) {
          setError('Aucun billet disponible.')
          setSubmitting(false)
          return
        }

        const res = await fetch('/api/checkout/create-event-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId,
            entitySlug,
            eventSlug,
            eventId,
            ticketTypeId: target.ticketTypeId,
            attendeeName: bookerName,
            attendeeEmail: bookerEmail,
            formAnswers: {},
            autoRegister: true,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.url) {
          setError(data.error || 'Impossible de démarrer le paiement.')
          setSubmitting(false)
          return
        }
        window.location.href = data.url
        return
      }

      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          activityId: target.activityId,
          ticketTypeId: target.ticketTypeId,
          formAnswers: {},
          autoRegister: true,
        }),
      })
      const data = await res.json()

      if (res.status === 409) {
        setRegistered(true)
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'inscription.')
        setSubmitting(false)
        return
      }

      setRegistered(true)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleParticipateClick() {
    setError('')
    if (needsPlacePicker) {
      setSelectedActivityId(availableActivities[0]?.id ?? '')
      setPlaceOverlayOpen(true)
      return
    }
    void submitRegistration(defaultTarget)
  }

  function handlePlaceConfirm() {
    const activity = availableActivities.find((a) => a.id === selectedActivityId)
    if (!activity) {
      setError('Sélectionnez une place.')
      return
    }
    setPlaceOverlayOpen(false)
    void submitRegistration(resolveTargetForActivity(activity))
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          className="detail-entity-strip__cta"
          disabled={submitting || (!needsPlacePicker && !defaultTarget)}
          onClick={handleParticipateClick}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
              Inscription…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Participer
            </>
          )}
        </button>
        {error ? (
          <p className="m-0 max-w-[220px] text-right text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {placeOverlayOpen ? (
        <div className="event-place-overlay" role="presentation">
          <button
            type="button"
            className="event-place-overlay__backdrop"
            aria-label="Fermer"
            onClick={() => setPlaceOverlayOpen(false)}
          />
          <div
            className="event-place-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-place-title"
          >
            <header className="event-place-panel__head">
              <h2 id="event-place-title" className="event-place-panel__title">
                Choisir votre place
              </h2>
              <button
                type="button"
                className="event-place-panel__close"
                aria-label="Fermer"
                onClick={() => setPlaceOverlayOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="event-place-panel__body">
              <p className="event-place-panel__hint">Sélectionnez la session à laquelle vous souhaitez participer.</p>
              <div className="event-place-panel__list">
                {availableActivities.map((activity) => (
                  <label
                    key={activity.id}
                    className={`event-place-option${
                      selectedActivityId === activity.id ? ' is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="event-place"
                      value={activity.id}
                      checked={selectedActivityId === activity.id}
                      onChange={() => setSelectedActivityId(activity.id)}
                    />
                    <span className="event-place-option__main">
                      <span className="event-place-option__title">{activity.title}</span>
                      <span className="event-place-option__slot">{activity.slotLabel}</span>
                    </span>
                    {activity.remaining != null ? (
                      <span className="event-place-option__places">
                        {activity.remaining > 0
                          ? `${activity.remaining} place${activity.remaining > 1 ? 's' : ''}`
                          : 'Complet'}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>

            <footer className="event-place-panel__foot">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPlaceOverlayOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn--accent"
                disabled={!selectedActivityId || submitting}
                onClick={handlePlaceConfirm}
              >
                {submitting ? 'Inscription…' : 'Valider'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}
