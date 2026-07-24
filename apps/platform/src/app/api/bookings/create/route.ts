import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createBooking,
  getAppointmentTypeById,
  requiresBookingPayment,
  trackEvent,
  isEntityEmailBanned,
} from '@ibee/supabase'
import { notifyBookingCreated } from '@/lib/booking-notifications'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      appointment_type_id,
      entity_id,
      booker_name,
      booker_email,
      booker_phone,
      booker_message,
      start_at,
      end_at,
    } = body

    if (
      !appointment_type_id ||
      !entity_id ||
      !booker_name ||
      !booker_email ||
      !start_at ||
      !end_at
    ) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = await createClient()

    const service = await getAppointmentTypeById(supabase, appointment_type_id)
    if (!service || service.entity_id !== entity_id || !service.is_active) {
      return NextResponse.json({ error: 'Service introuvable.' }, { status: 404 })
    }

    if (requiresBookingPayment(service)) {
      return NextResponse.json(
        { error: 'Ce service nécessite un paiement en ligne.' },
        { status: 400 },
      )
    }

    const bookerEmail = String(booker_email).trim()
    if (await isEntityEmailBanned(supabase, entity_id, bookerEmail)) {
      return NextResponse.json(
        { error: 'Réservation impossible pour cette adresse email.' },
        { status: 403 },
      )
    }

    const booking = await createBooking(supabase, {
      appointment_type_id,
      entity_id,
      booker_name: String(booker_name).trim(),
      booker_email: String(booker_email).trim(),
      booker_phone: booker_phone || null,
      booker_message: booker_message || null,
      start_at,
      end_at,
    })

    await trackEvent(supabase, {
      entity_id,
      event_type: 'booking_created',
      resource_id: booking.id,
      metadata: { appointment_type_id },
    })

    void notifyBookingCreated(booking)

    return NextResponse.json({ success: true, booking })
  } catch (err: unknown) {
    console.error('[api/bookings/create]', err)
    const message = err instanceof Error ? err.message : 'Erreur lors de la réservation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
