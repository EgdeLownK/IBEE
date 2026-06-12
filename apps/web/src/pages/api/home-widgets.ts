/** @deprecated Phase 9 — CRUD widgets via dashboard (`home-widgets-actions`). Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId, purgeEntityCache } from '@ibee/supabase'
import { isWidgetConfigured, isSingleInstanceHomeWidget, normalizeWidgetConfig } from '@ibee/ui-server'

const VALID_TYPES = [
  'widget_shop',
  'widget_service',
  'widget_event',
  'widget_news',
  'widget_bio',
  'widget_faq',
  'widget_announcement',
] as const
type ValidWidgetType = (typeof VALID_TYPES)[number]

function isValidType(t: unknown): t is ValidWidgetType {
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
    return new Response(JSON.stringify({ error: 'Invalid widget type' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  if (isSingleInstanceHomeWidget(type)) {
    const { data: existing } = await authClient
      .from('entity_home_widgets')
      .select('id')
      .eq('entity_id', entity.id)
      .eq('type', type as never)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Widget already exists', type }), { status: 409 })
    }
  }

  const { data: positions } = await authClient
    .from('entity_home_widgets')
    .select('position')
    .eq('entity_id', entity.id)
    .order('position', { ascending: false })
    .limit(1)
  const nextPosition = (positions?.[0]?.position ?? 0) + 1

  const defaultConfig: Record<string, unknown> =
    type === 'widget_news' ? { mode: 'latest', limit: 3 }
    : type === 'widget_bio' ? { mode: 'profile' }
    : type === 'widget_faq' ? { mode: 'menu' }
    : {}

  const { error: insErr } = await authClient
    .from('entity_home_widgets')
    .insert({
      entity_id: entity.id,
      type: type as never,
      is_active: true,
      position: nextPosition,
      config: defaultConfig,
    })

  if (insErr) {
    console.error('[api/home-widgets] insert error', insErr)
    return new Response(JSON.stringify({ error: insErr.message }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, type, entity_slug: entity.slug }))
}

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const widgetId = body?.id
  const config = body?.config

  if (typeof widgetId !== 'string' || !widgetId) {
    return new Response(JSON.stringify({ error: 'Missing widget id' }), { status: 400 })
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return new Response(JSON.stringify({ error: 'Invalid config' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  const { data: widget, error: fetchErr } = await authClient
    .from('entity_home_widgets')
    .select('id, entity_id, type')
    .eq('id', widgetId)
    .eq('entity_id', entity.id)
    .maybeSingle()

  if (fetchErr || !widget) {
    return new Response(JSON.stringify({ error: 'Widget not found' }), { status: 404 })
  }

  const normalized = normalizeWidgetConfig(config)
  if (!isWidgetConfigured(widget.type, normalized)) {
    return new Response(JSON.stringify({ error: 'Invalid widget config for type', type: widget.type }), { status: 400 })
  }

  const { error: upErr } = await authClient
    .from('entity_home_widgets')
    .update({ config: normalized as never })
    .eq('id', widgetId)

  if (upErr) {
    console.error('[api/home-widgets] patch error', upErr)
    return new Response(JSON.stringify({ error: upErr.message }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, id: widgetId, entity_slug: entity.slug }))
}

export const PUT: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const order = body?.order

  if (!Array.isArray(order) || order.length === 0 || !order.every((id: unknown) => typeof id === 'string' && id)) {
    return new Response(JSON.stringify({ error: 'Invalid order' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  const { data: widgets, error: fetchErr } = await authClient
    .from('entity_home_widgets')
    .select('id, type')
    .eq('entity_id', entity.id)
    .order('position', { ascending: true })

  if (fetchErr || !widgets) {
    console.error('[api/home-widgets] reorder fetch error', fetchErr)
    return new Response(JSON.stringify({ error: 'Failed to load widgets' }), { status: 500 })
  }

  const visibleWidgets = widgets.filter((w) => w.type !== 'widget_history')
  const visibleIds = new Set(visibleWidgets.map((w) => w.id))
  const orderSet = new Set(order as string[])

  if (
    orderSet.size !== order.length
    || visibleIds.size !== orderSet.size
    || !(order as string[]).every((id) => visibleIds.has(id))
  ) {
    return new Response(JSON.stringify({ error: 'Order mismatch' }), { status: 400 })
  }

  const hiddenWidgets = widgets.filter((w) => w.type === 'widget_history')
  const updates: { id: string; position: number }[] = (order as string[]).map((id, i) => ({
    id,
    position: i,
  }))
  hiddenWidgets.forEach((w, i) => {
    updates.push({ id: w.id, position: (order as string[]).length + i })
  })

  const results = await Promise.all(
    updates.map(({ id, position }) =>
      authClient
        .from('entity_home_widgets')
        .update({ position })
        .eq('id', id)
        .eq('entity_id', entity.id),
    ),
  )

  const updateErr = results.find((r) => r.error)?.error
  if (updateErr) {
    console.error('[api/home-widgets] reorder update error', updateErr)
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, entity_slug: entity.slug }))
}

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const widgetId = body?.id

  if (typeof widgetId !== 'string' || !widgetId) {
    return new Response(JSON.stringify({ error: 'Missing widget id' }), { status: 400 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  const { data: widget, error: fetchErr } = await authClient
    .from('entity_home_widgets')
    .select('id, entity_id')
    .eq('id', widgetId)
    .eq('entity_id', entity.id)
    .maybeSingle()

  if (fetchErr || !widget) {
    return new Response(JSON.stringify({ error: 'Widget not found' }), { status: 404 })
  }

  const { error: delErr } = await authClient
    .from('entity_home_widgets')
    .delete()
    .eq('id', widgetId)

  if (delErr) {
    console.error('[api/home-widgets] delete error', delErr)
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, id: widgetId, entity_slug: entity.slug }))
}
