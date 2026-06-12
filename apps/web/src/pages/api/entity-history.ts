/** @deprecated Phase 9 — histoire via dashboard (`history-actions`). Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId, purgeEntityCache, upsertEntityHistory } from '@ibee/supabase'
import type { HistoryBlock } from '@ibee/supabase'
import { parseHistoryBlocks, HISTORY_MAX_BLOCKS } from '@ibee/ui-server'

function validateBlocks(raw: unknown): HistoryBlock[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > HISTORY_MAX_BLOCKS) return null
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    if (row.type === 'text') {
      const content = typeof row.content === 'string' ? row.content : ''
      if (content.length > 2000) return null
    } else if (row.type === 'image') {
      const images = Array.isArray(row.images) ? row.images : []
      const legacyUrl = typeof row.url === 'string' ? row.url.trim() : ''
      const hasImages = images.some((img) => {
        if (!img || typeof img !== 'object' || Array.isArray(img)) return false
        const entry = img as Record<string, unknown>
        return typeof entry.url === 'string' && !!entry.url.trim()
      })
      if (!hasImages && !legacyUrl) return null
    } else {
      return null
    }
  }
  return parseHistoryBlocks(raw)
}

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const blocks = validateBlocks(body?.blocks)
  if (blocks === null) {
    return new Response(JSON.stringify({ error: 'Invalid blocks' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  try {
    await upsertEntityHistory(authClient, entity.id, blocks)
  } catch (err) {
    console.error('[api/entity-history] upsert error', err)
    return new Response(JSON.stringify({ error: 'Save failed' }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, entity_slug: entity.slug }))
}
