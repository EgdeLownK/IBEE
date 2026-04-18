import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export async function getEntityByUserId(
  client: SupabaseClient<Database>,
  userId: string
) {
  const { data, error } = await client
    .from('entity')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getEntityBySlug(
  client: SupabaseClient<Database>,
  slug: string
) {
  const { data, error } = await client
    .from('entity')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getEntityMenuSections(
  client: SupabaseClient<Database>,
  entityId: string
) {
  const { data, error } = await client
    .from('entity_menu_sections')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getEntityHomeWidgets(
  client: SupabaseClient<Database>,
  entityId: string
) {
  const { data, error } = await client
    .from('entity_home_widgets')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getEntityFaq(
  client: SupabaseClient<Database>,
  entityId: string
) {
  const [featureResult, itemsResult] = await Promise.all([
    client
      .from('entity_global_features')
      .select('*')
      .eq('entity_id', entityId)
      .eq('type', 'faq')
      .eq('is_active', true)
      .maybeSingle(),
    client
      .from('entity_faq_items')
      .select('*')
      .eq('entity_id', entityId)
      .order('position', { ascending: true })
  ])

  if (featureResult.error) throw featureResult.error
  if (itemsResult.error) throw itemsResult.error

  return {
    isActive: featureResult.data !== null,
    items: itemsResult.data ?? []
  }
}
