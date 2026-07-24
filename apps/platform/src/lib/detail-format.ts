export function formatDetailPrice(cents: number | null, currency: string) {
  if (cents === null || cents === 0) return '0€'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

export const LOCATION_LABELS: Record<string, string> = {
  video: 'Visioconférence',
  in_person: 'Sur place',
  phone: 'Téléphone',
}

export function locationLabel(locationType: string) {
  return LOCATION_LABELS[locationType] ?? 'Visioconférence'
}

export const EVENT_LOCATION_LABELS: Record<string, string> = {
  online: 'En ligne',
  in_person: 'Sur place',
}

export function eventLocationLabel(locationType: string) {
  return EVENT_LOCATION_LABELS[locationType] ?? 'En ligne'
}

export function parseReviewRatings(ratingParam: string | undefined): number[] {
  if (!ratingParam) return []
  return Array.from(
    new Set(
      ratingParam
        .split(',')
        .map((r) => parseInt(r, 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5),
    ),
  ).sort((a, b) => b - a)
}
