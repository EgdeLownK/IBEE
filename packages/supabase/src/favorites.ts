import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

type Client = SupabaseClient<Database>

export async function listFavoritesByUser(client: Client, userId: string) {
  const { data, error } = await client
    .from('favorites')
    .select('*, entity(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addFavorite(client: Client, userId: string, entityId: string) {
  const { error } = await client
    .from('favorites')
    .upsert({ user_id: userId, entity_id: entityId })

  if (error) throw error
}

export async function removeFavorite(client: Client, userId: string, entityId: string) {
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_id', entityId)

  if (error) throw error
}
