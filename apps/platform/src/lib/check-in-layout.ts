/** Largeur max pour le mode scan staff (téléphone à l'entrée). */
export const CHECK_IN_MOBILE_MEDIA_QUERY = '(max-width: 767px)'

export function buildStaffCheckInUrl(eventId: string, origin: string): string {
  const url = new URL('/dashboard/activite/billetterie/check-in', origin)
  url.searchParams.set('eventId', eventId)
  url.searchParams.set('scan', '1')
  return url.toString()
}

export function buildParticipantEntreeUrl(entitySlug: string, eventSlug: string, origin: string): string {
  return new URL(`/${entitySlug}/events/${eventSlug}/entree`, origin).toString()
}
