import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export const MENU_SECTION_TYPES = [
  'home',
  'news',
  'events',
  'videos',
  'shop',
  'links',
  'appointments',
  'history',
  'faq',
] as const

export type MenuSectionType = (typeof MENU_SECTION_TYPES)[number]

export const PROFILE_TAB_TYPES = [
  'shop',
  'appointments',
  'events',
  'news',
  'history',
] as const

export type ProfileTabType = (typeof PROFILE_TAB_TYPES)[number]

export function isMenuSectionType(t: unknown): t is MenuSectionType {
  return typeof t === 'string' && (MENU_SECTION_TYPES as readonly string[]).includes(t)
}

export async function listMenuSectionStates(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<{ type: ProfileTabType; active: boolean }[]> {
  const { data, error } = await client
    .from('entity_menu_sections')
    .select('type, is_active')
    .eq('entity_id', entityId)

  if (error) throw error

  const activeSet = new Set(
    (data ?? []).filter((row) => row.is_active).map((row) => row.type as string)
  )

  return PROFILE_TAB_TYPES.map((type) => ({
    type,
    active: activeSet.has(type),
  }))
}

export async function activateEntityMenuSection(
  client: SupabaseClient<Database>,
  entityId: string,
  type: MenuSectionType
) {
  const { data: existing } = await client
    .from('entity_menu_sections')
    .select('id, position')
    .eq('entity_id', entityId)
    .eq('type', type)
    .maybeSingle()

  if (existing) {
    const { error } = await client
      .from('entity_menu_sections')
      .update({ is_active: true })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const { data: positions } = await client
    .from('entity_menu_sections')
    .select('position')
    .eq('entity_id', entityId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (positions?.[0]?.position ?? 0) + 1

  const { error } = await client.from('entity_menu_sections').insert({
    entity_id: entityId,
    type,
    is_active: true,
    is_configured: false,
    position: nextPosition,
  })

  if (error) throw error
}

export async function deactivateEntityMenuSection(
  client: SupabaseClient<Database>,
  entityId: string,
  type: MenuSectionType
) {
  const { error } = await client
    .from('entity_menu_sections')
    .delete()
    .eq('entity_id', entityId)
    .eq('type', type)

  if (error) throw error
}
