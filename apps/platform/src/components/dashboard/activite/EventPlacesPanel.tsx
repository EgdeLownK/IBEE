'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { saveEventActivityAction } from '@/app/dashboard/site/event-ticket-actions'
import { formatEventCardTime } from '@/lib/event-catalog-view'
import { isEventRootPlace } from '@/lib/event-place-view'
import type { BilletterieEventActivitySnapshot } from '@/lib/load-billetterie-data'

type Props = {
  eventId: string
  places: BilletterieEventActivitySnapshot[]
}

type DraftState = Record<string, string>

function capacityLabel(place: BilletterieEventActivitySnapshot): string {
  if (place.capacity == null) {
    return `${place.confirmedCount} inscrit${place.confirmedCount > 1 ? 's' : ''} · illimité`
  }
  const remaining = Math.max(0, place.capacity - place.confirmedCount)
  return `${place.confirmedCount}/${place.capacity} inscrit${place.confirmedCount > 1 ? 's' : ''} · ${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`
}

export function EventPlacesPanel({ eventId, places }: Props) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftState>({})
  const [message, setMessage] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setDrafts(
      Object.fromEntries(places.map((place) => [place.id, place.capacity?.toString() ?? ''])),
    )
  }, [places])

  function saveCapacity(place: BilletterieEventActivitySnapshot) {
    setMessage('')
    setSavingId(place.id)

    startTransition(async () => {
      const result = await saveEventActivityAction({
        eventId,
        activityId: place.id,
        title: place.title,
        startAt: place.startAt,
        endAt: place.endAt,
        capacity: drafts[place.id] ?? '',
      })

      setSavingId(null)
      if (!result.ok) {
        setMessage(result.error ?? 'Erreur lors de l’enregistrement.')
        return
      }

      setMessage('Capacité enregistrée.')
      router.refresh()
    })
  }

  return (
    <section className="event-places-panel" aria-label="Places de l'événement">
      <div className="event-places-panel__head">
        <p className="event-places-panel__hint">
          {places.length === 1 && isEventRootPlace(places[0])
            ? 'Définis le nombre maximum de participants pour cet événement. Laisse vide pour illimité.'
            : 'Chaque place correspond à un créneau ou une discipline (foot, basket…). Définis la jauge de participants par place. Laisse vide pour illimité.'}
        </p>
      </div>

      {message ? <p className="event-places-panel__message">{message}</p> : null}

      <ul className="event-places-panel__list">
        {places.map((place) => {
          const draft = drafts[place.id] ?? ''
          const saved = place.capacity?.toString() ?? ''
          const isDirty = draft !== saved

          return (
            <li key={place.id} className="event-places-panel__item">
              <div className="event-places-panel__main">
                <p className="event-places-panel__name">{place.title}</p>
                <p className="event-places-panel__slot">
                  {formatEventCardTime(place.startAt, place.endAt)}
                </p>
                <p className="event-places-panel__stats">{capacityLabel(place)}</p>
              </div>

              <div className="event-places-panel__field">
                <label className="event-places-panel__label" htmlFor={`place-cap-${place.id}`}>
                  Places max
                </label>
                <div className="event-places-panel__controls">
                  <input
                    id={`place-cap-${place.id}`}
                    type="number"
                    min={place.confirmedCount > 0 ? place.confirmedCount : 1}
                    step={1}
                    className="event-places-panel__input"
                    placeholder="Illimité"
                    value={draft}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [place.id]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="event-places-panel__save"
                    disabled={pending || !isDirty}
                    onClick={() => saveCapacity(place)}
                  >
                    {savingId === place.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
