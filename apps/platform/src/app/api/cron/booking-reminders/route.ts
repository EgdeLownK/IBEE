import { NextResponse } from 'next/server'
import { listBookingsDueForReminder, markBookingReminderSent } from '@ibee/supabase'
import { sendBookingReminderEmail } from '@/lib/booking-email'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOCATION_LABELS: Record<string, string> = {
  in_person: 'Sur place',
  video: 'Visio',
  phone: 'Téléphone',
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true

  return request.headers.get('x-cron-secret') === secret
}

function resolveLocationLabel(locationType: string, details: string | null): string {
  if (details?.trim()) return details.trim()
  return LOCATION_LABELS[locationType] ?? locationType
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Non autorisé.' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const rows = await listBookingsDueForReminder(supabase)

    let sent = 0
    const errors: string[] = []

    for (const row of rows) {
      const service = row.appointment_types
      if (!service) continue

      const result = await sendBookingReminderEmail({
        bookingId: row.id,
        bookerName: row.booker_name,
        bookerEmail: row.booker_email,
        startAt: row.start_at,
        endAt: row.end_at,
        serviceTitle: service.title,
        locationLabel: resolveLocationLabel(service.location_type, service.location_details),
        entityName: row.entity?.display_name ?? 'Prestataire',
        status: 'confirmed',
      })

      if (result.ok) {
        await markBookingReminderSent(supabase, row.id)
        sent += 1
      } else if (!result.skipped && result.error) {
        errors.push(`${row.id}: ${result.error}`)
      }
    }

    return NextResponse.json({
      ok: true,
      due: rows.length,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[cron:booking-reminders]', err)
    return NextResponse.json({ ok: false, error: 'Erreur interne.' }, { status: 500 })
  }
}
