/** @deprecated Phase 9 — édition owner via dashboard (`menu-section-actions`). Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import {
  activateEntityMenuSection,
  deactivateEntityMenuSection,
  getEntityByUserId,
  isMenuSectionType,
  purgeEntityCache,
} from '@ibee/supabase'

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const type = body?.type

  if (!isMenuSectionType(type)) {
    return new Response(JSON.stringify({ error: 'Invalid section type' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  try {
    await activateEntityMenuSection(authClient, entity.id, type)
  } catch (err) {
    console.error('[api/menu-sections] activate', err)
    return new Response(JSON.stringify({ error: 'Activation failed' }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  void purgeEntityCache(entity.slug, siteUrl)

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

  if (!isMenuSectionType(type)) {
    return new Response(JSON.stringify({ error: 'Invalid section type' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  try {
    await deactivateEntityMenuSection(authClient, entity.id, type)
  } catch (err) {
    console.error('[api/menu-sections] deactivate', err)
    return new Response(JSON.stringify({ error: 'Deactivation failed' }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  void purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, type, entity_slug: entity.slug }))
}
