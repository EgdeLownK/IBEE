import type { Database } from '@ibee/supabase'
import {
  formatServiceMoney,
  formatServiceRelativeTime,
  type BookingStatus,
  type ServiceBookingView,
} from '@/lib/service-booking-view'

type AppointmentTypeRow = Database['public']['Tables']['appointment_types']['Row']

const LOCATION_LABELS: Record<Database['public']['Enums']['appointment_location_type'], string> = {
  in_person: 'Sur place',
  video: 'Visio',
  phone: 'Téléphone',
}

export type ServiceCatalogLine = {
  id: string
  title: string
  slug: string
  durationMinutes: number
  locationLabel: string
  priceLabel: string | null
  isActive: boolean
  imageUrl: string | null
}

export type ServiceActivityItem = {
  id: string
  bookingId: string
  bookingRef: string
  customer: string
  title: string
  detail: string | null
  at: string
}

const ACTIVITY_LIMIT = 20

const STATUS_ACTIVITY: Record<BookingStatus, string> = {
  pending: 'Demande en attente',
  confirmed: 'Réservation confirmée',
  completed: 'Rendez-vous terminé',
  cancelled: 'Réservation annulée',
  no_show: 'No-show enregistré',
}

export function mapServiceCatalogLine(row: AppointmentTypeRow): ServiceCatalogLine {
  const priceCents = row.promo_price_cents ?? row.price_cents
  const gallery = Array.isArray(row.gallery_images) ? row.gallery_images : []
  const imageUrl = typeof gallery[0] === 'string' && gallery[0].trim() ? gallery[0] : null

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    durationMinutes: row.duration_minutes,
    locationLabel: LOCATION_LABELS[row.location_type],
    priceLabel: formatServiceMoney(priceCents, row.currency),
    isActive: row.is_active,
    imageUrl,
  }
}

export function buildServiceRecentActivity(
  bookings: ServiceBookingView[],
  limit = ACTIVITY_LIMIT,
): ServiceActivityItem[] {
  return [...bookings]
    .sort((a, b) => {
      const aAt = a.cancelledAt ?? a.createdAt
      const bAt = b.cancelledAt ?? b.createdAt
      return new Date(bAt).getTime() - new Date(aAt).getTime()
    })
    .slice(0, limit)
    .map((booking) => ({
      id: booking.id,
      bookingId: booking.id,
      bookingRef: booking.ref,
      customer: booking.customer,
      title: STATUS_ACTIVITY[booking.status],
      detail: booking.serviceTitle,
      at: booking.cancelledAt ?? booking.createdAt,
    }))
}

export { formatServiceRelativeTime }
