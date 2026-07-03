import 'server-only'

import type { ActivityHubSignals } from '@ibee/supabase'
import type { ActivityCapabilitiesView } from '@/lib/activity-modules'

export function filterActivitySignals(
  signals: ActivityHubSignals,
  capabilities: ActivityCapabilitiesView
): Partial<ActivityHubSignals> {
  const filtered: Partial<ActivityHubSignals> = {}
  if (capabilities.shop) filtered.orders = signals.orders
  if (capabilities.appointments) filtered.bookings = signals.bookings
  if (capabilities.events) filtered.registrations = signals.registrations
  return filtered
}
