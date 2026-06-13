'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import {
  getEntityByUserId,
  purgeEntityCache,
} from '@ibee/supabase'
import {
  isSingleInstanceHomeWidget,
  isWidgetConfigured,
  normalizeWidgetConfig,
} from '@ibee/shared'

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

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

async function requireEntity() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) throw new Error('Profil introuvable')

  return { supabase, entity }
}

function defaultConfigForType(type: ValidWidgetType): Record<string, unknown> {
  if (type === 'widget_news') return { mode: 'latest', limit: 3 }
  if (type === 'widget_bio') return { mode: 'profile' }
  if (type === 'widget_faq') return { mode: 'menu' }
  return {}
}

export async function createHomeWidgetAction(type: string) {
  if (!isValidType(type)) {
    return { ok: false as const, error: 'Type de widget invalide.' }
  }

  try {
    const { supabase, entity } = await requireEntity()

    if (isSingleInstanceHomeWidget(type)) {
      const { data: existing } = await supabase
        .from('entity_home_widgets')
        .select('id')
        .eq('entity_id', entity.id)
        .eq('type', type)
        .maybeSingle()

      if (existing) {
        return { ok: false as const, error: 'Ce widget est déjà sur l\'accueil.' }
      }
    }

    const { data: positions } = await supabase
      .from('entity_home_widgets')
      .select('position')
      .eq('entity_id', entity.id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = (positions?.[0]?.position ?? 0) + 1

    const { data: inserted, error } = await supabase
      .from('entity_home_widgets')
      .insert({
        entity_id: entity.id,
        type,
        is_active: true,
        position: nextPosition,
        config: JSON.parse(JSON.stringify(defaultConfigForType(type))),
      })
      .select('id, type, position, config')
      .single()

    if (error || !inserted) {
      console.error('[createHomeWidgetAction]', error)
      return { ok: false as const, error: 'Impossible d\'ajouter ce widget.' }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return {
      ok: true as const,
      widget: {
        id: inserted.id,
        type: inserted.type,
        position: inserted.position,
        config: normalizeWidgetConfig(inserted.config),
      },
    }
  } catch (err) {
    console.error('[createHomeWidgetAction]', err)
    return { ok: false as const, error: 'Impossible d\'ajouter ce widget.' }
  }
}

export async function updateHomeWidgetConfigAction(widgetId: string, config: Record<string, unknown>) {
  if (!widgetId) {
    return { ok: false as const, error: 'Widget introuvable.' }
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ok: false as const, error: 'Configuration invalide.' }
  }

  try {
    const { supabase, entity } = await requireEntity()

    const { data: widget, error: fetchErr } = await supabase
      .from('entity_home_widgets')
      .select('id, entity_id, type')
      .eq('id', widgetId)
      .eq('entity_id', entity.id)
      .maybeSingle()

    if (fetchErr || !widget) {
      return { ok: false as const, error: 'Widget introuvable.' }
    }

    const normalized = normalizeWidgetConfig(config)
    if (!isWidgetConfigured(widget.type, normalized)) {
      return { ok: false as const, error: 'Configuration incomplète pour ce type de widget.' }
    }

    const { error: upErr } = await supabase
      .from('entity_home_widgets')
      .update({ config: normalized as never })
      .eq('id', widgetId)

    if (upErr) {
      console.error('[updateHomeWidgetConfigAction]', upErr)
      return { ok: false as const, error: 'Impossible de sauvegarder la configuration.' }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return { ok: true as const, id: widgetId, config: normalized }
  } catch (err) {
    console.error('[updateHomeWidgetConfigAction]', err)
    return { ok: false as const, error: 'Impossible de sauvegarder la configuration.' }
  }
}

export async function reorderHomeWidgetsAction(order: string[]) {
  if (!Array.isArray(order) || order.length === 0 || !order.every((id) => typeof id === 'string' && id)) {
    return { ok: false as const, error: 'Ordre invalide.' }
  }

  try {
    const { supabase, entity } = await requireEntity()

    const { data: widgets, error: fetchErr } = await supabase
      .from('entity_home_widgets')
      .select('id, type')
      .eq('entity_id', entity.id)
      .order('position', { ascending: true })

    if (fetchErr || !widgets) {
      return { ok: false as const, error: 'Impossible de charger les widgets.' }
    }

    const visibleWidgets = widgets.filter((w) => w.type !== 'widget_history')
    const visibleIds = new Set(visibleWidgets.map((w) => w.id))
    const orderSet = new Set(order)

    if (
      orderSet.size !== order.length
      || visibleIds.size !== orderSet.size
      || !order.every((id) => visibleIds.has(id))
    ) {
      return { ok: false as const, error: 'Ordre des widgets incohérent.' }
    }

    const hiddenWidgets = widgets.filter((w) => w.type === 'widget_history')
    const updates: { id: string; position: number }[] = order.map((id, i) => ({
      id,
      position: i,
    }))
    hiddenWidgets.forEach((w, i) => {
      updates.push({ id: w.id, position: order.length + i })
    })

    const results = await Promise.all(
      updates.map(({ id, position }) =>
        supabase
          .from('entity_home_widgets')
          .update({ position })
          .eq('id', id)
          .eq('entity_id', entity.id)
      )
    )

    const updateErr = results.find((r) => r.error)?.error
    if (updateErr) {
      console.error('[reorderHomeWidgetsAction]', updateErr)
      return { ok: false as const, error: 'Impossible de réorganiser les widgets.' }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return { ok: true as const }
  } catch (err) {
    console.error('[reorderHomeWidgetsAction]', err)
    return { ok: false as const, error: 'Impossible de réorganiser les widgets.' }
  }
}

export async function deleteHomeWidgetAction(widgetId: string) {
  if (!widgetId) {
    return { ok: false as const, error: 'Widget introuvable.' }
  }

  try {
    const { supabase, entity } = await requireEntity()

    const { data: widget, error: fetchErr } = await supabase
      .from('entity_home_widgets')
      .select('id')
      .eq('id', widgetId)
      .eq('entity_id', entity.id)
      .maybeSingle()

    if (fetchErr || !widget) {
      return { ok: false as const, error: 'Widget introuvable.' }
    }

    const { error: delErr } = await supabase.from('entity_home_widgets').delete().eq('id', widgetId)

    if (delErr) {
      console.error('[deleteHomeWidgetAction]', delErr)
      return { ok: false as const, error: 'Impossible de supprimer ce widget.' }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return { ok: true as const, id: widgetId }
  } catch (err) {
    console.error('[deleteHomeWidgetAction]', err)
    return { ok: false as const, error: 'Impossible de supprimer ce widget.' }
  }
}
