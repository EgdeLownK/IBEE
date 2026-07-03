import 'server-only'

import { canCancelBookingByPolicy, getBookingById } from '@ibee/supabase'
import { verifyBookingCancelToken } from '@/lib/booking-cancel-token'
import { createServiceClient } from '@/lib/supabase/admin'

export type BookingCancelView = {
  id: string
  bookerName: string
  serviceTitle: string
  slotLabel: string
  entityName: string
  status: string
  token: string
  canCancel: boolean
  policyLabel: string | null
}

export type BookingCancelLoadResult =
  | { kind: 'invalid' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'ready'; data: BookingCancelView }

function formatSlot(startAt: string, endAt: string): string {
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

export async function loadBookingCancel(token: string | undefined): Promise<BookingCancelLoadResult> {
  if (!token?.trim()) return { kind: 'invalid' }

  const parsed = verifyBookingCancelToken(token)
  if (!parsed) return { kind: 'invalid' }

  const supabase = createServiceClient()
  const booking = await getBookingById(supabase, parsed.bookingId)
  if (!booking) return { kind: 'invalid' }

  if (booking.status === 'cancelled') {
    return { kind: 'unavailable', reason: 'Ce rendez-vous est déjà annulé.' }
  }

  if (booking.status === 'completed' || booking.status === 'no_show') {
    return { kind: 'unavailable', reason: 'Ce rendez-vous ne peut plus être annulé.' }
  }

  const service = booking.appointment_types
  const cancelMinHours = service?.cancel_min_hours ?? 24
  const policyAllowed = canCancelBookingByPolicy(booking.start_at, cancelMinHours)

  if (!policyAllowed) {
    const hoursLabel =
      cancelMinHours >= 24
        ? `${Math.round(cancelMinHours / 24)} jour(s)`
        : `${cancelMinHours} h`
    return {
      kind: 'unavailable',
      reason: `Délai d’annulation dépassé — annulation possible jusqu’à ${hoursLabel} avant le rendez-vous.`,
    }
  }

  const { data: entity } = await supabase
    .from('entity')
    .select('display_name')
    .eq('id', booking.entity_id)
    .maybeSingle()

  const policyLabel =
    cancelMinHours > 0
      ? `Politique : annulation jusqu’à ${cancelMinHours >= 24 ? `${Math.round(cancelMinHours / 24)} j` : `${cancelMinHours} h`} avant le créneau.`
      : null

  return {
    kind: 'ready',
    data: {
      id: booking.id,
      bookerName: booking.booker_name,
      serviceTitle: service?.title ?? 'Rendez-vous',
      slotLabel: formatSlot(booking.start_at, booking.end_at),
      entityName: entity?.display_name ?? 'Prestataire',
      status: booking.status,
      token,
      canCancel: booking.status === 'pending' || booking.status === 'confirmed',
      policyLabel,
    },
  }
}
