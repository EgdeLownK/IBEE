import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export async function isFollowing(
  client: SupabaseClient<Database>,
  userId: string,
  entityId: string
): Promise<boolean> {
  const { data } = await client
    .from('follows')
    .select('id')
    .eq('follower_user_id', userId)
    .eq('followed_entity_id', entityId)
    .maybeSingle()

  return data !== null
}

export async function followEntity(
  client: SupabaseClient<Database>,
  userId: string,
  entityId: string
) {
  const { error } = await client
    .from('follows')
    .insert({ follower_user_id: userId, followed_entity_id: entityId })

  if (error) throw error
}

export async function unfollowEntity(
  client: SupabaseClient<Database>,
  userId: string,
  entityId: string
) {
  const { error } = await client
    .from('follows')
    .delete()
    .eq('follower_user_id', userId)
    .eq('followed_entity_id', entityId)

  if (error) throw error
}
