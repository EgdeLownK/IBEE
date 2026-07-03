import {
  getAppointmentTypeById,
  markBookingConfirmationSent,
} from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { sendBookingConfirmationEmail } from '@/lib/booking-email'
import { createServiceClient } from '@/lib/supabase/admin'

const LOCATION_LABELS: Record<string, string> = {
  in_person: 'Sur place',
  video: 'Visio',
  phone: 'Téléphone',
}

type BookingRow = {
  id: string
  entity_id: string
  appointment_type_id: string
  booker_name: string
  booker_email: string
  start_at: string
  end_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
}

function resolveLocationLabel(locationType: string, details: string | null): string {
  if (details?.trim()) return details.trim()
  return LOCATION_LABELS[locationType] ?? locationType
}

async function getEntityDisplayName(
  supabase: SupabaseClient<Database>,
  entityId: string
): Promise<string> {
  const { data } = await supabase
    .from('entity')
    .select('display_name')
    .eq('id', entityId)
    .maybeSingle()

  return data?.display_name ?? 'Prestataire'
}

export async function notifyBookingCreated(
  booking: BookingRow,
  opts: { supabase?: SupabaseClient<Database> } = {}
) {
  const supabase = opts.supabase ?? createServiceClient()

  try {
    const [service, entityName] = await Promise.all([
      getAppointmentTypeById(supabase, booking.appointment_type_id),
      getEntityDisplayName(supabase, booking.entity_id),
    ])

    if (!service) return

    const result = await sendBookingConfirmationEmail({
      bookingId: booking.id,
      bookerName: booking.booker_name,
      bookerEmail: booking.booker_email,
      startAt: booking.start_at,
      endAt: booking.end_at,
      serviceTitle: service.title,
      locationLabel: resolveLocationLabel(service.location_type, service.location_details),
      entityName,
      status: booking.status === 'confirmed' ? 'confirmed' : 'pending',
    })

    if (result.ok) {
      await markBookingConfirmationSent(supabase, booking.id)
    }
  } catch (error) {
    console.error('[notifyBookingCreated]', error)
  }
}
