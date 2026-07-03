import { NextResponse } from 'next/server'
import { listRegistrationsDueForReminder, markRegistrationReminderSent } from '@ibee/supabase'
import { sendEventReminderEmail } from '@/lib/event-registration-email'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true

  return request.headers.get('x-cron-secret') === secret
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Non autorisé.' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const rows = await listRegistrationsDueForReminder(supabase)
    const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

    let sent = 0
    const errors: string[] = []

    for (const row of rows) {
      const { data: event } = await supabase
        .from('events')
        .select('title, slug, start_at, end_at, entity_id')
        .eq('id', row.event_id)
        .maybeSingle()

      const { data: entity } = await supabase
        .from('entity')
        .select('slug')
        .eq('id', row.entity_id)
        .maybeSingle()

      if (!event || !entity?.slug || !row.ticket_code) continue

      const ticketUrl = `${siteUrl}/${entity.slug}/events/${event.slug}/billet?code=${encodeURIComponent(row.ticket_code)}`

      const result = await sendEventReminderEmail({
        attendeeName: row.attendee_name,
        attendeeEmail: row.attendee_email,
        eventTitle: event.title,
        eventStartAt: event.start_at,
        eventEndAt: event.end_at,
        ticketUrl,
      })

      if (result.ok) {
        await markRegistrationReminderSent(supabase, row.id)
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
    console.error('[cron:event-reminders]', err)
    return NextResponse.json({ ok: false, error: 'Erreur interne.' }, { status: 500 })
  }
}
