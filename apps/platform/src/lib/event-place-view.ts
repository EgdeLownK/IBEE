/** Place synthétique quand l'événement n'a pas encore de sous-places en BDD. */
export const EVENT_ROOT_PLACE_ID = 'event-root'

export type EventPlaceLike = {
  id: string
  isEventRoot?: boolean
}

export function isEventRootPlace(place: EventPlaceLike): boolean {
  return place.isEventRoot === true || place.id === EVENT_ROOT_PLACE_ID
}
