/** @deprecated Phase 9 — FAQ via dashboard. Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId, purgeEntityCache, upsertEntityFaq } from '@ibee/supabase'
import { validateFaqItems } from '@ibee/ui-server'

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const items = validateFaqItems(body?.items)
  if (items === null) {
    return new Response(JSON.stringify({ error: 'Invalid FAQ items' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  try {
    await upsertEntityFaq(authClient, entity.id, items)
  } catch (err) {
    console.error('[api/entity-faq] upsert error', err)
    return new Response(JSON.stringify({ error: 'Save failed' }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, entity_slug: entity.slug }))
}
