import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { getNotifications, getUnreadCount } from './notifications'

export type ActivityHubSignal = {
  count: number
  href: string
}

export type ActivityHubSignals = {
  orders: ActivityHubSignal
  bookings: ActivityHubSignal
  registrations: ActivityHubSignal
}

export async function getActivityHubSignals(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<ActivityHubSignals> {
  const now = new Date()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const sinceSevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [ordersRes, pendingBookingsRes, upcomingBookingsRes, registrationsRes] = await Promise.all([
    client
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('status', 'paid')
      .in('fulfillment_status', ['pending', 'to_ship', 'ready']),
    client
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('status', 'pending'),
    client
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('status', 'confirmed')
      .gte('start_at', now.toISOString())
      .lte('start_at', inSevenDays),
    client
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('status', 'confirmed')
      .gte('created_at', sinceSevenDays),
  ])

  if (ordersRes.error) throw ordersRes.error
  if (pendingBookingsRes.error) throw pendingBookingsRes.error
  if (upcomingBookingsRes.error) throw upcomingBookingsRes.error
  if (registrationsRes.error) throw registrationsRes.error

  const bookingsCount = (pendingBookingsRes.count ?? 0) + (upcomingBookingsRes.count ?? 0)

  return {
    orders: {
      count: ordersRes.count ?? 0,
      href: '/dashboard/activite/boutique',
    },
    bookings: {
      count: bookingsCount,
      href: '/dashboard/activite/service',
    },
    registrations: {
      count: registrationsRes.count ?? 0,
      href: '/dashboard/activite/billetterie',
    },
  }
}

export async function getActivityHub(
  client: SupabaseClient<Database>,
  userId: string,
  entityId: string,
  opts: { notificationLimit?: number } = {}
) {
  const { notificationLimit = 20 } = opts

  const [signals, unreadCount, notifications] = await Promise.all([
    getActivityHubSignals(client, entityId),
    getUnreadCount(client, userId),
    getNotifications(client, userId, { limit: notificationLimit }),
  ])

  return { signals, unreadCount, notifications }
}
