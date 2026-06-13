import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEntityMessage, getEntityBySlug, getEntityContactInfo } from '@ibee/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const entitySlug = typeof body.entity_slug === 'string' ? body.entity_slug.trim() : ''
  const senderName = typeof body.sender_name === 'string' ? body.sender_name.trim() : ''
  const senderEmail = typeof body.sender_email === 'string' ? body.sender_email.trim() : ''
  const messageBody = typeof body.body === 'string' ? body.body.trim() : ''

  if (!entitySlug || !senderName || !senderEmail || !messageBody) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  if (senderName.length > 120 || senderEmail.length > 320 || messageBody.length > 2000) {
    return NextResponse.json({ error: 'Contenu trop long' }, { status: 400 })
  }
  if (!EMAIL_RE.test(senderEmail)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, entitySlug)
  if (!entity) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }

  const contactInfo = await getEntityContactInfo(supabase, entity.id)
  if (!contactInfo?.message_enabled) {
    return NextResponse.json({ error: 'Messagerie désactivée' }, { status: 403 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && entity.user_id && user.id === entity.user_id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous écrire à vous-même' }, { status: 400 })
  }

  try {
    await createEntityMessage(supabase, {
      entity_id: entity.id,
      sender_user_id: user?.id ?? null,
      sender_name: senderName,
      sender_email: senderEmail,
      body: messageBody,
    })
  } catch (err) {
    console.error('[api/entity-messages]', err)
    return NextResponse.json({ error: 'Envoi impossible' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
