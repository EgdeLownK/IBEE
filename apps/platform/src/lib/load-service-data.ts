import 'server-only'

import {
  getAvailabilityExceptions,
  getAvailabilitySchedule,
  getAppointmentTypesByEntity,
  getBookingsByEntity,
  getClientsByEntity,
  type BookingWithType,
} from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import {
  buildServiceTodaySnapshot,
  mapBookingToView,
  type ServiceDashboardData,
} from '@/lib/service-booking-view'
import {
  addDays,
  mapExceptionRows,
  mapScheduleRows,
  startOfWeekMonday,
  toIsoDate,
} from '@/lib/service-planning-view'
import { mapClientToView } from '@/lib/service-client-view'
import { mapServiceCatalogLine } from '@/lib/service-catalog-view'

type Client = SupabaseClient<Database>

function isMissingBookingsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error ? String(error.message) : ''
  return (
    message.includes('bookings') ||
    message.includes('availability_')
  ) && (message.includes('does not exist') || message.includes('schema cache'))
}

export async function loadServiceDashboardData(
  client: Client,
  entityId: string
): Promise<ServiceDashboardData> {
  const weekStart = startOfWeekMonday(new Date())
  const exceptionFrom = toIsoDate(weekStart)
  const exceptionTo = toIsoDate(addDays(weekStart, 90))

  try {
    const [rows, schedulesRaw, exceptionsRaw, clientRows, serviceRows] = await Promise.all([
      getBookingsByEntity(client, entityId, { limit: 200 }),
      getAvailabilitySchedule(client, entityId),
      getAvailabilityExceptions(client, entityId, exceptionFrom, exceptionTo),
      getClientsByEntity(client, entityId),
      getAppointmentTypesByEntity(client, entityId, { activeOnly: true }),
    ])

    const bookings = rows.map((row: BookingWithType) => mapBookingToView(row))
    const clients = clientRows.map(mapClientToView)
    const services = serviceRows.map(mapServiceCatalogLine)

    return {
      bookings,
      today: buildServiceTodaySnapshot(bookings),
      schedules: mapScheduleRows(schedulesRaw),
      exceptions: mapExceptionRows(exceptionsRaw),
      clients,
      services,
    }
  } catch (error) {
    if (isMissingBookingsTableError(error)) {
      return {
        bookings: [],
        today: { pendingCount: 0, todayCount: 0, upcomingCount: 0 },
        schedules: [],
        exceptions: [],
        clients: [],
        services: [],
      }
    }
    throw error
  }
}
