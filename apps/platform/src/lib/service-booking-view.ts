import type { BookingWithType } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import type { ServiceClientView } from '@/lib/service-client-view'
import type { ServiceCatalogLine } from '@/lib/service-catalog-view'
import type { AvailabilityExceptionRow, AvailabilityScheduleRow } from '@/lib/service-planning-view'

export type BookingStatus = Database['public']['Enums']['booking_status']
export type AppointmentLocationType = Database['public']['Enums']['appointment_location_type']

export type ServiceBookingView = {
  id: string
  ref: string
  entityId: string
  appointmentTypeId: string
  serviceTitle: string
  serviceDurationMinutes: number
  locationType: AppointmentLocationType
  locationLabel: string
  serviceColor: string | null
  serviceImageUrl: string | null
  priceCents: number | null
  currency: string
  customer: string
  email: string
  phone: string | null
  message: string | null
  notes: string | null
  status: BookingStatus
  startAt: string
  endAt: string
  createdAt: string
  cancelledAt: string | null
}

export type ServiceBookingFilter =
  'all' | 'pending' | 'today' | 'upcoming' | 'recent' | 'cancelled' | 'no_show'

export const SERVICE_BOOKING_FILTERS: ReadonlyArray<{
  id: ServiceBookingFilter
  label: string
}> = [
  { id: 'all', label: 'Tout' },
  { id: 'pending', label: 'À confirmer' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'upcoming', label: 'À venir' },
  { id: 'recent', label: 'Terminés' },
  { id: 'cancelled', label: 'Annulés' },
  { id: 'no_show', label: 'No-show' },
]

export type ServiceTodaySnapshot = {
  pendingCount: number
  todayCount: number
  upcomingCount: number
}

export type ServiceDashboardData = {
  bookings: ServiceBookingView[]
  today: ServiceTodaySnapshot
  schedules: AvailabilityScheduleRow[]
  exceptions: AvailabilityExceptionRow[]
  clients: ServiceClientView[]
  services: ServiceCatalogLine[]
}

type BookingRow = BookingWithType

const LOCATION_LABELS: Record<AppointmentLocationType, string> = {
  in_person: 'Sur place',
  video: 'Visio',
  phone: 'Téléphone',
}

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const UPCOMING_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function mapBookingToView(row: BookingRow): ServiceBookingView {
  const service = row.appointment_types
  const priceCents = service?.promo_price_cents ?? service?.price_cents ?? null
  const gallery = service?.gallery_images
  const serviceImageUrl =
    Array.isArray(gallery) && typeof gallery[0] === 'string' && gallery[0].trim()
      ? gallery[0].trim()
      : null

  return {
    id: row.id,
    ref: formatBookingRef(row.id, row.created_at),
    entityId: row.entity_id,
    appointmentTypeId: row.appointment_type_id,
    serviceTitle: service?.title ?? 'Service',
    serviceDurationMinutes: service?.duration_minutes ?? 0,
    locationType: service?.location_type ?? 'video',
    locationLabel: resolveLocationLabel(
      service?.location_type ?? 'video',
      service?.location_details ?? null,
    ),
    serviceColor: service?.color ?? null,
    serviceImageUrl,
    priceCents,
    currency: service?.currency ?? 'EUR',
    customer: row.booker_name.trim() || row.booker_email.trim() || 'Client',
    email: row.booker_email,
    phone: row.booker_phone,
    message: row.booker_message,
    notes: row.notes,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  }
}

export function formatBookingRef(id: string, createdAt: string): string {
  const date = new Date(createdAt)
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  return `#RDV-${stamp}-${id.slice(0, 4).toUpperCase()}`
}

export function formatServiceMoney(cents: number | null, currency = 'EUR'): string | null {
  if (cents == null) return null
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

export function formatServiceRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `il y a ${diffHours} h`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function formatBookingSlot(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const datePart = start.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const label = `${datePart.charAt(0).toUpperCase()}${datePart.slice(1)}`
  return `${label} · ${timeFmt.format(start)} — ${timeFmt.format(end)}`
}

export function isBookingToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function isBookingUpcoming(iso: string): boolean {
  const start = new Date(iso).getTime()
  const now = Date.now()
  return start >= now && start <= now + UPCOMING_DAYS_MS
}

export function isBookingRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() <= RECENT_DAYS_MS
}

function resolveLocationLabel(
  locationType: AppointmentLocationType,
  locationDetails: string | null,
): string {
  if (locationDetails?.trim()) return locationDetails.trim()
  return LOCATION_LABELS[locationType]
}

export function matchesServiceBookingFilter(
  booking: ServiceBookingView,
  filter: ServiceBookingFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'pending':
      return booking.status === 'pending'
    case 'today':
      return (
        isBookingToday(booking.startAt) &&
        (booking.status === 'pending' || booking.status === 'confirmed')
      )
    case 'upcoming':
      return booking.status === 'confirmed' && isBookingUpcoming(booking.startAt)
    case 'recent':
      return booking.status === 'completed' && isBookingRecent(booking.endAt)
    case 'cancelled':
      return booking.status === 'cancelled'
    case 'no_show':
      return booking.status === 'no_show'
    default:
      return true
  }
}

export function searchServiceBookings(
  bookings: ServiceBookingView[],
  query: string,
): ServiceBookingView[] {
  const q = query.trim().toLowerCase()
  if (!q) return bookings

  return bookings.filter((booking) => {
    const haystack = [
      booking.ref,
      booking.customer,
      booking.email,
      booking.phone ?? '',
      booking.serviceTitle,
      booking.message ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function sortServiceBookings(
  bookings: ServiceBookingView[],
  filter: ServiceBookingFilter,
): ServiceBookingView[] {
  return [...bookings].sort((a, b) => {
    if (filter === 'all' || filter === 'pending') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    if (filter === 'recent' || filter === 'cancelled' || filter === 'no_show') {
      return new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
    }
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  })
}

export function filterServiceBookings(
  bookings: ServiceBookingView[],
  filter: ServiceBookingFilter,
  searchQuery = '',
): ServiceBookingView[] {
  const searched = searchServiceBookings(bookings, searchQuery)
  const filtered = searched.filter((booking) => matchesServiceBookingFilter(booking, filter))
  return sortServiceBookings(filtered, filter)
}

export function countServiceBookingsByFilter(
  bookings: ServiceBookingView[],
  filter: ServiceBookingFilter,
): number {
  return bookings.filter((booking) => matchesServiceBookingFilter(booking, filter)).length
}

export function buildServiceTodaySnapshot(bookings: ServiceBookingView[]): ServiceTodaySnapshot {
  return {
    pendingCount: bookings.filter((b) => b.status === 'pending').length,
    todayCount: bookings.filter(
      (b) => isBookingToday(b.startAt) && (b.status === 'pending' || b.status === 'confirmed'),
    ).length,
    upcomingCount: bookings.filter((b) => b.status === 'confirmed' && isBookingUpcoming(b.startAt))
      .length,
  }
}

export function bookingIsoDate(iso: string): string {
  const date = new Date(iso)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function bookingsOnDate(
  bookings: ServiceBookingView[],
  isoDate: string,
): ServiceBookingView[] {
  return [...bookings]
    .filter((booking) => bookingIsoDate(booking.startAt) === isoDate)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
}

export type ServiceBookingHourGroup = {
  hourLabel: string
  bookings: ServiceBookingView[]
}

export function groupBookingsByHour(bookings: ServiceBookingView[]): ServiceBookingHourGroup[] {
  const groups = new Map<string, ServiceBookingView[]>()

  for (const booking of bookings) {
    const date = new Date(booking.startAt)
    const hourLabel = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0))

    const list = groups.get(hourLabel) ?? []
    list.push(booking)
    groups.set(hourLabel, list)
  }

  return [...groups.entries()].map(([hourLabel, hourBookings]) => ({
    hourLabel,
    bookings: hourBookings,
  }))
}

export type ServiceDaySummaryLine = {
  key: string
  name: string
  qty: number
}

/** Récap prestations du jour (agrégé par service), même logique que shop « À traiter ». */
export function buildServiceDaySummary(bookings: ServiceBookingView[]): ServiceDaySummaryLine[] {
  const counts = new Map<string, number>()

  for (const booking of bookings) {
    counts.set(booking.serviceTitle, (counts.get(booking.serviceTitle) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .map(([name, qty], index) => ({
      key: `svc-${index}-${name}`,
      name,
      qty,
    }))
}
