import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>

export type CreateBookingCheckoutInput = {
  entityId: string
  appointmentTypeId: string
  bookerName: string
  bookerEmail: string
  bookerPhone?: string | null
  bookerMessage?: string | null
  startAt: string
  endAt: string
  source?: string
}

export function resolveAppointmentUnitPriceCents(service: {
  price_cents: number | null
  promo_price_cents: number | null
}): number {
  return service.promo_price_cents ?? service.price_cents ?? 0
}

export function resolveAppointmentChargeCents(service: {
  payment_required: boolean
  price_cents: number | null
  promo_price_cents: number | null
  deposit_percent: number
}): number {
  if (!service.payment_required) return 0
  const unit = resolveAppointmentUnitPriceCents(service)
  if (unit <= 0) return 0
  return Math.max(1, Math.floor((unit * service.deposit_percent) / 100))
}

export function requiresBookingPayment(service: {
  payment_required: boolean
  price_cents: number | null
  promo_price_cents: number | null
  deposit_percent: number
}): boolean {
  return resolveAppointmentChargeCents(service) > 0
}

export async function createBookingCheckout(
  client: Client,
  input: CreateBookingCheckoutInput
): Promise<string> {
  const { data, error } = await client.rpc('create_booking_checkout', {
    p_entity_id: input.entityId,
    p_appointment_type_id: input.appointmentTypeId,
    p_booker_name: input.bookerName,
    p_booker_email: input.bookerEmail,
    p_booker_phone: input.bookerPhone ?? undefined,
    p_booker_message: input.bookerMessage ?? undefined,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_source: input.source ?? 'web',
  })

  if (error) throw error
  if (!data) throw new Error('create_booking_checkout returned no booking id')
  return data
}

export async function attachStripeSessionToBooking(
  client: Client,
  bookingId: string,
  stripeSessionId: string
) {
  const { error } = await client.rpc('attach_stripe_session_to_booking', {
    p_booking_id: bookingId,
    p_stripe_session_id: stripeSessionId,
  })
  if (error) throw error
}

export async function completeBookingCheckout(
  client: Client,
  input: {
    stripeSessionId: string
    paymentIntentId?: string | null
  }
): Promise<string> {
  const { data, error } = await client.rpc('complete_booking_checkout', {
    p_stripe_session_id: input.stripeSessionId,
    p_payment_intent_id: input.paymentIntentId ?? undefined,
  })

  if (error) throw error
  if (!data) throw new Error('complete_booking_checkout returned no booking id')
  return data
}

export async function expireStaleBookingCheckouts(client: Client): Promise<number> {
  const { data, error } = await client.rpc('expire_stale_booking_checkouts')
  if (error) throw error
  return data ?? 0
}

export async function getBookingByStripeSessionId(client: Client, stripeSessionId: string) {
  const { data, error } = await client
    .from('bookings')
    .select('*, appointment_types(id, title, duration_minutes, location_type, location_details, color, price_cents, promo_price_cents, currency)')
    .eq('stripe_checkout_session_id', stripeSessionId)
    .maybeSingle()

  if (error) throw error
  return data
}

export function formatCancellationPolicyLabel(cancelMinHours: number): string {
  if (cancelMinHours <= 0) {
    return 'Annulation possible jusqu’au début du rendez-vous.'
  }
  if (cancelMinHours < 24) {
    return `Annulation possible jusqu’à ${cancelMinHours} h avant le rendez-vous.`
  }
  const days = Math.round(cancelMinHours / 24)
  if (days === 1) {
    return 'Annulation possible jusqu’à 24 h avant le rendez-vous.'
  }
  return `Annulation possible jusqu’à ${days} jours avant le rendez-vous.`
}

export function canCancelBookingByPolicy(
  startAtIso: string,
  cancelMinHours: number,
  nowMs = Date.now()
): boolean {
  const startMs = new Date(startAtIso).getTime()
  if (startMs <= nowMs) return false
  const deadlineMs = startMs - cancelMinHours * 60 * 60 * 1000
  return nowMs < deadlineMs
}
