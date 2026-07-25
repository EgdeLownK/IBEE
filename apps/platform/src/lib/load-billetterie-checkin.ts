import 'server-only'

import { getEventCheckInLiveStats, listEventsForCheckIn } from '@ibee/supabase'
import type { CheckInEventOption, EventCheckInLiveStats } from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'

type Client = SupabaseClient<Database>

export type BilletterieCheckInData = {
  events: CheckInEventOption[]
  selectedEventId: string | null
  stats: EventCheckInLiveStats | null
}

export async function loadBilletterieCheckInData(
  client: Client,
  entityId: string,
  preferredEventId?: string | null,
): Promise<BilletterieCheckInData> {
  const events = await listEventsForCheckIn(client, entityId)
  const selectedEventId =
    preferredEventId && events.some((event) => event.id === preferredEventId)
      ? preferredEventId
      : (events.find((event) => event.isToday)?.id ?? events[0]?.id ?? null)

  const stats = selectedEventId
    ? await getEventCheckInLiveStats(client, entityId, selectedEventId)
    : null

  return { events, selectedEventId, stats }
}
