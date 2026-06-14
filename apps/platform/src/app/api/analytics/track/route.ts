import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateTrackEventsBody } from '@ibee/shared'
import { trackEvents } from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'

const VISITOR_COOKIE = 'ibee_vid'
const MAX_AGE = 60 * 60 * 24 * 365

function newVisitorKey() {
  return crypto.randomUUID()
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }

  const parsed = validateTrackEventsBody(body)
  if (!parsed.ok || !parsed.events) {
    return NextResponse.json({ error: parsed.error ?? 'Requête invalide.' }, { status: 400 })
  }

  const cookieStore = await cookies()
  let visitorKey = cookieStore.get(VISITOR_COOKIE)?.value ?? null
  const setCookie = !visitorKey
  if (!visitorKey) visitorKey = newVisitorKey()

  const events = parsed.events.map((event) => ({
    entity_id: event.entity_id,
    event_type: event.event_type,
    visitor_key: event.visitor_key ?? visitorKey,
    section_type: event.section_type ?? null,
    resource_id: event.resource_id ?? null,
    metadata: event.metadata ?? {},
  }))

  try {
    const supabase = await createClient()
    await trackEvents(supabase, events)
  } catch (err) {
    console.error('[api/analytics/track]', err)
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }

  const response = new NextResponse(null, { status: 204 })
  if (setCookie && visitorKey) {
    response.cookies.set(VISITOR_COOKIE, visitorKey, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: MAX_AGE,
      path: '/',
    })
  }
  return response
}
