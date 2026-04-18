import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export async function getNotifications(
  client: SupabaseClient<Database>,
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = opts

  let query = client
    .from('notifications')
    .select('*, actor_entity:entity!notifications_actor_entity_id_fkey(id, display_name, avatar_url, slug), target_publication:publications!notifications_target_publication_id_fkey(slug)')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

export async function getUnreadCount(
  client: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .is('read_at', null)

  if (error) throw error
  return count ?? 0
}

export async function markAsRead(
  client: SupabaseClient<Database>,
  notificationId: string
) {
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllAsRead(
  client: SupabaseClient<Database>,
  userId: string
) {
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null)

  if (error) throw error
}
