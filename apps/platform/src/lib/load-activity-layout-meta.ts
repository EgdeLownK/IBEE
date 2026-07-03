import 'server-only'

import { listEventsForCheckIn } from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'

type Client = SupabaseClient<Database>

export async function loadActivityTodayEventId(
  client: Client,
  entityId: string,
  eventsEnabled: boolean
): Promise<string | null> {
  if (!eventsEnabled) return null

  try {
    const events = await listEventsForCheckIn(client, entityId)
    return events.find((event) => event.isToday)?.id ?? null
  } catch {
    return null
  }
}
