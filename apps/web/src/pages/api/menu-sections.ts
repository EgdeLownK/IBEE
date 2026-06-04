import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId, purgeEntityCache } from '@ibee/supabase'

const VALID_TYPES = ['home', 'news', 'events', 'videos', 'shop', 'links', 'appointments', 'history', 'faq'] as const
type ValidType = typeof VALID_TYPES[number]

function isValidType(t: unknown): t is ValidType {
  return typeof t === 'string' && (VALID_TYPES as readonly string[]).includes(t)
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const type = body?.type

  if (!isValidType(type)) {
    return new Response(JSON.stringify({ error: 'Invalid section type' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  const { data: existing } = await authClient
    .from('entity_menu_sections')
    .select('id, position')
    .eq('entity_id', entity.id)
    .eq('type', type as never)
    .maybeSingle()

  if (existing) {
    const { error: upErr } = await authClient
      .from('entity_menu_sections')
      .update({ is_active: true })
      .eq('id', existing.id)
    if (upErr) {
      console.error('[api/menu-sections] update error', upErr)
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500 })
    }
  } else {
    const { data: positions } = await authClient
      .from('entity_menu_sections')
      .select('position')
      .eq('entity_id', entity.id)
      .order('position', { ascending: false })
      .limit(1)
    const nextPosition = (positions?.[0]?.position ?? 0) + 1

    const { error: insErr } = await authClient
      .from('entity_menu_sections')
      .insert({
        entity_id: entity.id,
        type: type as never,
        is_active: true,
        is_configured: false,
        position: nextPosition,
      })
    if (insErr) {
      console.error('[api/menu-sections] insert error', insErr)
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500 })
    }
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, type, entity_slug: entity.slug }))
}

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const type = body?.type

  if (!isValidType(type)) {
    return new Response(JSON.stringify({ error: 'Invalid section type' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  const { error } = await authClient
    .from('entity_menu_sections')
    .delete()
    .eq('entity_id', entity.id)
    .eq('type', type as never)

  if (error) {
    console.error('[api/menu-sections] delete error', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, type, entity_slug: entity.slug }))
}
