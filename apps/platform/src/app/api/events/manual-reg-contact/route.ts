import { NextResponse } from 'next/server'
import { submitManualRegContactSession } from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : null

  if (!token) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const result = await submitManualRegContactSession(supabase, {
      token,
      name,
      email,
      phone,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/events/manual-reg-contact]', err)
    return NextResponse.json({ error: 'Envoi impossible.' }, { status: 500 })
  }
}
