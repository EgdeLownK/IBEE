import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

type Booking = {
  id: string
  appointment_type_id: string
  entity_id: string
  client_id: string | null
  booker_name: string
  booker_email: string
  booker_phone: string | null
  booker_message: string | null
  start_at: string
  end_at: string
  status: BookingStatus
  cancelled_by: string | null
  cancelled_at: string | null
  notes: string | null
  price_cents: number | null
  currency: string
  payment_status: Database['public']['Enums']['booking_payment_status']
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  refund_cents: number
  checkout_expires_at: string | null
  source: string
  confirmation_sent_at: string | null
  reminder_sent_at: string | null
  created_at: string
  updated_at: string
}

export type BookingWithType = Booking & {
  appointment_types: {
    id: string
    title: string
    duration_minutes: number
    location_type: Database['public']['Enums']['appointment_location_type']
    location_details: string | null
    color: string | null
    price_cents: number | null
    promo_price_cents: number | null
    currency: string | null
    gallery_images?: string[] | null
    cancel_min_hours?: number
    payment_required?: boolean
    deposit_percent?: number
  } | null
}

export async function getBookingsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { status?: BookingStatus; from?: string; to?: string; limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = opts

  let query = client
    .from('bookings')
    .select('*, appointment_types(id, title, duration_minutes, location_type, location_details, color, price_cents, promo_price_cents, currency, gallery_images, cancel_min_hours, payment_required, deposit_percent)')
    .eq('entity_id', entityId)
    .order('start_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.from) query = query.gte('start_at', opts.from)
  if (opts.to) query = query.lte('start_at', opts.to)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as BookingWithType[]
}

export async function getBookingById(
  client: SupabaseClient<Database>,
  id: string
) {
  const { data, error } = await client
    .from('bookings')
    .select('*, appointment_types(id, title, duration_minutes, location_type, location_details, color, price_cents, promo_price_cents, currency, gallery_images, cancel_min_hours, payment_required, deposit_percent)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as BookingWithType | null
}

export async function createBooking(
  client: SupabaseClient<Database>,
  data: {
    appointment_type_id: string
    entity_id: string
    booker_name: string
    booker_email: string
    booker_phone?: string | null
    booker_message?: string | null
    start_at: string
    end_at: string
  }
) {
  // Check for overlapping bookings
  const { data: conflicts } = await client
    .from('bookings')
    .select('id')
    .eq('entity_id', data.entity_id)
    .in('status', ['pending', 'confirmed'])
    .lt('start_at', data.end_at)
    .gt('end_at', data.start_at)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    throw new Error('Ce créneau n\'est plus disponible.')
  }

  const { data: typeRow } = await client
    .from('appointment_types')
    .select('auto_accept_bookings')
    .eq('id', data.appointment_type_id)
    .maybeSingle()
  const autoAccept = typeRow?.auto_accept_bookings !== false

  const { data: booking, error } = await client
    .from('bookings')
    .insert({
      appointment_type_id: data.appointment_type_id,
      entity_id: data.entity_id,
      booker_name: data.booker_name,
      booker_email: data.booker_email,
      booker_phone: data.booker_phone ?? null,
      booker_message: data.booker_message ?? null,
      start_at: data.start_at,
      end_at: data.end_at,
      status: autoAccept ? 'confirmed' : 'pending',
      source: 'web',
    })
    .select()
    .single()

  if (error) throw error
  return booking as Booking
}

export async function updateBookingStatus(
  client: SupabaseClient<Database>,
  id: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show',
  cancelledBy?: 'booker' | 'owner'
) {
  const update: Database['public']['Tables']['bookings']['Update'] = { status }

  if (status === 'cancelled') {
    update.cancelled_by = cancelledBy ?? 'owner'
    update.cancelled_at = new Date().toISOString()
  }

  const { data, error } = await client
    .from('bookings')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Booking
}

export async function updateBookingNotes(
  client: SupabaseClient<Database>,
  id: string,
  notes: string | null
) {
  const { error } = await client
    .from('bookings')
    .update({ notes })
    .eq('id', id)

  if (error) throw error
}

export type BookingAggregates = {
  count: number
  revenue: number
  pending: number
  confirmed: number
  cancelled: number
  noShow: number
}

export type BookingExtendedStats = {
  recap: {
    week: BookingAggregates
    month: BookingAggregates
    quarter: BookingAggregates
    year: BookingAggregates
  }
  weekChart: { label: string; count: number; revenue: number }[]
  yearChart: { label: string; count: number; revenue: number }[]
  byService: Record<string, { bookings: number; revenue: number }>
}

type BookingStatRow = {
  status: string
  start_at: string
  appointment_type_id: string
  appointment_types: { price_cents: number | null } | null
}

function aggregate(rows: BookingStatRow[], filter: (r: BookingStatRow) => boolean): BookingAggregates {
  let count = 0, revenue = 0, pending = 0, confirmed = 0, cancelled = 0, noShow = 0
  for (const r of rows) {
    if (!filter(r)) continue
    count++
    const price = r.appointment_types?.price_cents ?? 0
    if (r.status === 'confirmed' || r.status === 'completed') {
      revenue += price
      confirmed++
    } else if (r.status === 'pending') {
      pending++
    } else if (r.status === 'cancelled') {
      cancelled++
    } else if (r.status === 'no_show') {
      noShow++
    }
  }
  return { count, revenue, pending, confirmed, cancelled, noShow }
}

function bucketize(
  rows: BookingStatRow[],
  labels: string[],
  getIndex: (d: Date) => number
): { label: string; count: number; revenue: number }[] {
  const buckets = labels.map((label) => ({ label, count: 0, revenue: 0 }))
  for (const r of rows) {
    const i = getIndex(new Date(r.start_at))
    if (i < 0 || i >= buckets.length) continue
    buckets[i]!.count++
    if (r.status === 'confirmed' || r.status === 'completed') {
      buckets[i]!.revenue += r.appointment_types?.price_cents ?? 0
    }
  }
  return buckets
}

export async function getBookingExtendedStats(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<BookingExtendedStats> {
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const { data, error } = await client
    .from('bookings')
    .select('status, start_at, appointment_type_id, appointment_types(price_cents)')
    .eq('entity_id', entityId)
    .gte('start_at', yearStart.toISOString())

  if (error) throw error
  const rows = (data ?? []) as BookingStatRow[]

  // Week starts Monday
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  const dayOffset = (now.getDay() + 6) % 7
  weekStart.setDate(now.getDate() - dayOffset)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)

  const recap = {
    week: aggregate(rows, (r) => new Date(r.start_at) >= weekStart),
    month: aggregate(rows, (r) => new Date(r.start_at) >= monthStart),
    quarter: aggregate(rows, (r) => new Date(r.start_at) >= quarterStart),
    year: aggregate(rows, (r) => new Date(r.start_at) >= yearStart),
  }

  const weekLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const weekChart = bucketize(rows, weekLabels, (d) => {
    if (d < weekStart) return -1
    const diff = Math.floor((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 7 ? -1 : diff
  })

  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  const yearChart = bucketize(rows, monthLabels, (d) =>
    d.getFullYear() === now.getFullYear() ? d.getMonth() : -1
  )

  const byService: Record<string, { bookings: number; revenue: number }> = {}
  for (const r of rows) {
    const bucket = byService[r.appointment_type_id] ?? { bookings: 0, revenue: 0 }
    bucket.bookings++
    if (r.status === 'confirmed' || r.status === 'completed') {
      bucket.revenue += r.appointment_types?.price_cents ?? 0
    }
    byService[r.appointment_type_id] = bucket
  }

  return { recap, weekChart, yearChart, byService }
}

export async function getBookingStats(
  client: SupabaseClient<Database>,
  entityId: string
) {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  // Get all bookings for this month
  const { data: monthBookings, error } = await client
    .from('bookings')
    .select('status, start_at, appointment_type_id')
    .eq('entity_id', entityId)
    .gte('start_at', thisMonthStart)

  if (error) throw error

  const bookings = (monthBookings ?? []) as { status: string; start_at: string; appointment_type_id: string }[]

  const weekBookings = bookings.filter(b => new Date(b.start_at) >= thisWeekStart)

  const totalMonth = bookings.length
  const totalWeek = weekBookings.length
  const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
  const cancelled = bookings.filter(b => b.status === 'cancelled').length
  const noShow = bookings.filter(b => b.status === 'no_show').length
  const cancellationRate = totalMonth > 0 ? Math.round((cancelled / totalMonth) * 100) : 0

  // Popular hours
  const hourCounts: Record<number, number> = {}
  bookings.forEach(b => {
    const hour = new Date(b.start_at).getUTCHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  })

  // By type
  const typeCounts: Record<string, number> = {}
  bookings.forEach(b => {
    typeCounts[b.appointment_type_id] = (typeCounts[b.appointment_type_id] ?? 0) + 1
  })

  return {
    totalMonth,
    totalWeek,
    confirmed,
    cancelled,
    noShow,
    cancellationRate,
    hourCounts,
    typeCounts,
  }
}

export async function markBookingConfirmationSent(client: SupabaseClient<Database>, bookingId: string) {
  const { error } = await client
    .from('bookings')
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) throw error
}

export async function markBookingReminderSent(client: SupabaseClient<Database>, bookingId: string) {
  const { error } = await client
    .from('bookings')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) throw error
}

type BookingReminderRow = BookingWithType & {
  entity: { display_name: string } | null
}

export async function listBookingsDueForReminder(
  client: SupabaseClient<Database>
): Promise<BookingReminderRow[]> {
  const now = Date.now()
  const windowStart = new Date(now + 23 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000).toISOString()

  const { data, error } = await client
    .from('bookings')
    .select(
      '*, appointment_types(id, title, duration_minutes, location_type, location_details, color, price_cents, promo_price_cents, currency), entity:entity_id(display_name)'
    )
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd)

  if (error) throw error
  return (data ?? []) as BookingReminderRow[]
}
