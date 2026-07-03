export function buildManualRegContactUrl(
  entitySlug: string,
  eventSlug: string,
  token: string,
  origin: string
): string {
  return new URL(`/${entitySlug}/events/${eventSlug}/inscription/${token}`, origin).toString()
}
