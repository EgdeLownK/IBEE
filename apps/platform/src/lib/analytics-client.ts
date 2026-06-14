import type { TrackEventPayload } from '@ibee/shared'

export function trackAnalyticsEvents(events: TrackEventPayload[]) {
  if (events.length === 0) return

  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {})
}
