import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>

export type ProjectRevenueSnapshot = {
  weekValues: number[]
  yearValues: number[]
  balanceCents: number
  payoutLabelWeek: string
  payoutLabelYear: string
  transfers: { date: string; label: string; amount: string; source?: RevenueSource }[]
}

export type RevenueSource = 'shop' | 'service' | 'event'

type RevenueRow = { paid_at: string; total_cents: number; source: RevenueSource }

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatTransferDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

function formatTransferAmount(cents: number): string {
  const value = (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `+ ${value} €`
}

function sourceLabel(source: RevenueSource): string {
  switch (source) {
    case 'shop':
      return 'Boutique'
    case 'service':
      return 'Rendez-vous'
    case 'event':
      return 'Billetterie'
    default:
      return 'Encaissement'
  }
}

export async function getProjectRevenueSnapshot(
  client: Client,
  entityId: string,
  options: { sources?: RevenueSource[] } = {}
): Promise<ProjectRevenueSnapshot> {
  const enabledSources = new Set<RevenueSource>(
    options.sources ?? ['shop', 'service', 'event']
  )
  const includeShop = enabledSources.has('shop')
  const includeService = enabledSources.has('service')
  const includeEvent = enabledSources.has('event')

  const now = new Date()
  const weekStart = startOfDay(now)
  weekStart.setDate(weekStart.getDate() - 6)

  const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [shopOrders, eventOrders, paidBookings] = await Promise.all([
    includeShop
      ? client
          .from('orders')
          .select('paid_at, total_cents')
          .eq('entity_id', entityId)
          .eq('status', 'paid')
          .eq('order_kind', 'product')
          .gte('paid_at', yearStart.toISOString())
          .order('paid_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    includeEvent
      ? client
          .from('orders')
          .select('paid_at, total_cents')
          .eq('entity_id', entityId)
          .eq('status', 'paid')
          .eq('order_kind', 'event_ticket')
          .gte('paid_at', yearStart.toISOString())
          .order('paid_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    includeService
      ? client
          .from('bookings')
          .select('paid_at, price_cents')
          .eq('entity_id', entityId)
          .eq('payment_status', 'paid')
          .gte('paid_at', yearStart.toISOString())
          .order('paid_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (shopOrders.error) {
    console.error('Shop orders error:', shopOrders.error)
    throw new Error(shopOrders.error.message)
  }
  if (eventOrders.error) {
    console.error('Event orders error:', eventOrders.error)
    throw new Error(eventOrders.error.message)
  }
  if (paidBookings.error) {
    console.error('Paid bookings error:', paidBookings.error)
    throw new Error(paidBookings.error.message)
  }

  const rows: RevenueRow[] = [
    ...(shopOrders.data ?? []).map((row) => ({
      paid_at: row.paid_at as string,
      total_cents: row.total_cents,
      source: 'shop' as const,
    })),
    ...(eventOrders.data ?? []).map((row) => ({
      paid_at: row.paid_at as string,
      total_cents: row.total_cents,
      source: 'event' as const,
    })),
    ...(paidBookings.data ?? [])
      .filter((row) => row.paid_at)
      .map((row) => ({
        paid_at: row.paid_at as string,
        total_cents: row.price_cents ?? 0,
        source: 'service' as const,
      })),
  ].filter((row) => row.paid_at && row.total_cents > 0)

  const weekValues = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + index)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    const cents = rows
      .filter((row) => {
        const paidAt = new Date(row.paid_at)
        return paidAt >= day && paidAt < nextDay
      })
      .reduce((sum, row) => sum + row.total_cents, 0)
    return cents / 100
  })

  const yearValues = Array.from({ length: 12 }, (_, index) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    const cents = rows
      .filter((row) => {
        const paidAt = new Date(row.paid_at)
        return paidAt >= monthStart && paidAt < monthEnd
      })
      .reduce((sum, row) => sum + row.total_cents, 0)
    return cents / 100
  })

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const balanceCents = rows
    .filter((row) => new Date(row.paid_at) >= monthStart)
    .reduce((sum, row) => sum + row.total_cents, 0)

  const transfers = rows.slice(0, 8).map((row) => ({
    date: formatTransferDate(row.paid_at),
    label: sourceLabel(row.source),
    amount: formatTransferAmount(row.total_cents),
    source: row.source,
  }))

  const nextPayout = new Date(now)
  nextPayout.setDate(nextPayout.getDate() + ((8 - nextPayout.getDay() + 7) % 7 || 7))

  return {
    weekValues,
    yearValues,
    balanceCents,
    payoutLabelWeek: `CA encaissé ce mois`,
    payoutLabelYear: `Prochain virement estimé le ${nextPayout.toLocaleDateString('fr-FR')}`,
    transfers,
  }
}

export type EventTicketMetrics = {
  revenueCents: number
  orderCount: number
  avgBasketCents: number
  ticketsSold: number
}

export async function getEventTicketMetrics(
  client: Client,
  entityId: string,
  window: { from: string; to: string }
): Promise<EventTicketMetrics> {
  const { data: orders, error } = await client
    .from('orders')
    .select('id, total_cents')
    .eq('entity_id', entityId)
    .eq('order_kind', 'event_ticket')
    .eq('status', 'paid')
    .gte('paid_at', window.from)
    .lte('paid_at', window.to)

  if (error) {
    console.error('Event ticket metrics orders error:', error)
    throw new Error(error.message)
  }

  const paidOrders = orders ?? []
  const revenueCents = paidOrders.reduce((sum, order) => sum + (order.total_cents ?? 0), 0)
  const orderCount = paidOrders.length
  const avgBasketCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : 0

  const { count, error: countError } = await client
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', entityId)
    .eq('status', 'confirmed')
    .gte('created_at', window.from)
    .lte('created_at', window.to)

  if (countError) {
    console.error('Event ticket metrics count error:', countError)
    throw new Error(countError.message)
  }

  return {
    revenueCents,
    orderCount,
    avgBasketCents,
    ticketsSold: count ?? 0,
  }
}
