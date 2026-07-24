import 'server-only'

import { listMenuSectionStates } from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import type { ActivityCapabilitiesView, ActivityModuleKey } from '@/lib/activity-modules'

type Client = SupabaseClient<Database>

const MODULE_SECTION_KEYS: ActivityModuleKey[] = ['shop', 'appointments', 'events']

export async function getActivityCapabilities(
  client: Client,
  entityId: string,
): Promise<ActivityCapabilitiesView> {
  const [states, eventsRes] = await Promise.all([
    listMenuSectionStates(client, entityId),
    client
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('is_published', true),
  ])

  if (eventsRes.error) throw eventsRes.error

  const active = new Set(states.filter((row) => row.active).map((row) => row.type))
  const hasPublishedEvents = (eventsRes.count ?? 0) > 0

  return {
    shop: active.has('shop'),
    appointments: active.has('appointments'),
    events: active.has('events') || hasPublishedEvents,
  }
}

export function hasAnyActivityModule(capabilities: ActivityCapabilitiesView): boolean {
  return MODULE_SECTION_KEYS.some((key) => capabilities[key])
}

export function isActivityModuleEnabled(
  capabilities: ActivityCapabilitiesView,
  key: ActivityModuleKey,
): boolean {
  return capabilities[key]
}
