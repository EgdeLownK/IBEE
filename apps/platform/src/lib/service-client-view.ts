import type { Client } from '@ibee/supabase'
import { bookingIsoDate, formatServiceMoney, type ServiceBookingView } from '@/lib/service-booking-view'

export type ServiceClientView = {
  id: string
  name: string
  email: string
  phone: string | null
  notes: string | null
  bookingsCount: number
  totalRevenueCents: number
  totalRevenueLabel: string | null
  lastBookingAt: string | null
}

export function mapClientToView(client: Client): ServiceClientView {
  return {
    id: client.id,
    name: client.name.trim() || client.email,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    bookingsCount: client.bookings_count,
    totalRevenueCents: client.total_revenue_cents,
    totalRevenueLabel: formatServiceMoney(
      client.total_revenue_cents > 0 ? client.total_revenue_cents : null,
      'EUR'
    ),
    lastBookingAt: client.last_booking_at,
  }
}

export function searchServiceClients(clients: ServiceClientView[], query: string): ServiceClientView[] {
  const q = query.trim().toLowerCase()
  if (!q) return clients

  return clients.filter((client) => {
    const haystack = [client.name, client.email, client.phone ?? '', client.notes ?? '']
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function findClientForBooking(
  clients: ServiceClientView[],
  booking: { email: string }
): ServiceClientView | null {
  const email = booking.email.trim().toLowerCase()
  if (!email) return null
  return clients.find((client) => client.email.trim().toLowerCase() === email) ?? null
}

export function pickBookingForClient(
  bookings: ServiceBookingView[],
  client: ServiceClientView,
  preferredDay?: string
): ServiceBookingView | null {
  const email = client.email.trim().toLowerCase()
  if (!email) return null

  const matches = bookings.filter(
    (booking) => booking.email.trim().toLowerCase() === email
  )
  if (matches.length === 0) return null

  if (preferredDay) {
    const onDay = matches.find((booking) => bookingIsoDate(booking.startAt) === preferredDay)
    if (onDay) return onDay
  }

  const now = Date.now()
  const upcoming = matches
    .filter((booking) => new Date(booking.startAt).getTime() >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  if (upcoming.length > 0) return upcoming[0]

  return matches.sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  )[0]
}
