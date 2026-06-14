'use client'

import { useEffect, useRef } from 'react'
import type { TrackEventPayload } from '@ibee/shared'
import { trackAnalyticsEvents } from '@/lib/analytics-client'

type Props = {
  events: TrackEventPayload[]
}

export function TrackPageView({ events }: Props) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current || events.length === 0) return
    sent.current = true
    trackAnalyticsEvents(events)
  }, [events])

  return null
}
