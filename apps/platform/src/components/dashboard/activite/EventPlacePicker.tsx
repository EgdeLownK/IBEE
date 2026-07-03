'use client'

import { formatEventCardTime } from '@/lib/event-catalog-view'
import type { BilletterieEventActivitySnapshot } from '@/lib/load-billetterie-data'

type Props = {
  places: BilletterieEventActivitySnapshot[]
  selectedPlaceId: string | null
  onSelectPlace: (placeId: string) => void
}

function placeStatsLabel(place: BilletterieEventActivitySnapshot): string {
  if (place.capacity == null) {
    return `${place.confirmedCount} inscrit${place.confirmedCount > 1 ? 's' : ''}`
  }
  const remaining = Math.max(0, place.capacity - place.confirmedCount)
  return `${place.confirmedCount}/${place.capacity} · ${remaining} restante${remaining > 1 ? 's' : ''}`
}

export function EventPlacePicker({ places, selectedPlaceId, onSelectPlace }: Props) {
  return (
    <div className="event-place-picker">
      <p className="event-place-picker__label">Type de place</p>
      <ul className="event-place-picker__list">
        {places.map((place) => {
          const selected = selectedPlaceId === place.id
          return (
            <li key={place.id}>
              <button
                type="button"
                className={
                  selected ? 'event-place-picker__item is-selected' : 'event-place-picker__item'
                }
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelectPlace(place.id)}
              >
                <span className="event-place-picker__title">{place.title}</span>
                <span className="event-place-picker__slot">
                  {formatEventCardTime(place.startAt, place.endAt)}
                </span>
                <span className="event-place-picker__stats">{placeStatsLabel(place)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
