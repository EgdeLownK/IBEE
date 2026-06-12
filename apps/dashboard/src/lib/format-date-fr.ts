const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
]

/** « il y a 2 jours » — équivalent date-fns formatDistanceToNow + fr. */
export function formatRelativeDateFr(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const diffMs = date.getTime() - Date.now()
  const absMs = Math.abs(diffMs)

  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (absMs >= ms || unit === 'minute') {
      const amount = Math.round(diffMs / ms)
      return rtf.format(amount, unit)
    }
  }

  return rtf.format(0, 'minute')
}

/** « 5 mars 2026 à 14:30 » */
export function formatFullDateFr(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
  return formatted.replace(',', ' à')
}
