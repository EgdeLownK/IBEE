import type { APIRoute } from 'astro'
import { supabase } from '../../lib/supabase/client'
import { createAuthClient } from '../../lib/supabase/auth'
import { createEntityMessage, getEntityBySlug, getEntityContactInfo } from '@ibee/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}))

  const entitySlug = typeof body.entity_slug === 'string' ? body.entity_slug.trim() : ''
  const senderName = typeof body.sender_name === 'string' ? body.sender_name.trim() : ''
  const senderEmail = typeof body.sender_email === 'string' ? body.sender_email.trim() : ''
  const messageBody = typeof body.body === 'string' ? body.body.trim() : ''

  if (!entitySlug || !senderName || !senderEmail || !messageBody) {
    return new Response(JSON.stringify({ error: 'Champs requis manquants' }), { status: 400 })
  }
  if (senderName.length > 120 || senderEmail.length > 320 || messageBody.length > 2000) {
    return new Response(JSON.stringify({ error: 'Contenu trop long' }), { status: 400 })
  }
  if (!EMAIL_RE.test(senderEmail)) {
    return new Response(JSON.stringify({ error: 'Email invalide' }), { status: 400 })
  }

  const entity = await getEntityBySlug(supabase, entitySlug)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'Profil introuvable' }), { status: 404 })
  }

  const contactInfo = await getEntityContactInfo(supabase, entity.id)
  if (!contactInfo?.message_enabled) {
    return new Response(JSON.stringify({ error: 'Messagerie désactivée' }), { status: 403 })
  }

  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (user && entity.user_id && user.id === entity.user_id) {
    return new Response(JSON.stringify({ error: 'Vous ne pouvez pas vous écrire à vous-même' }), { status: 400 })
  }

  try {
    await createEntityMessage(authClient, {
      entity_id: entity.id,
      sender_user_id: user?.id ?? null,
      sender_name: senderName,
      sender_email: senderEmail,
      body: messageBody,
    })
  } catch (err) {
    console.error('[api/entity-messages] insert error', err)
    return new Response(JSON.stringify({ error: 'Envoi impossible' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }))
}
