import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type EntityMessage = {
  id: string
  entity_id: string
  sender_user_id: string | null
  sender_name: string
  sender_email: string
  body: string
  created_at: string
}

export async function createEntityMessage(
  client: SupabaseClient<Database>,
  payload: {
    entity_id: string
    sender_user_id?: string | null
    sender_name: string
    sender_email: string
    body: string
  }
): Promise<EntityMessage> {
  const { data, error } = await client
    .from('entity_messages')
    .insert({
      entity_id: payload.entity_id,
      sender_user_id: payload.sender_user_id ?? null,
      sender_name: payload.sender_name.trim(),
      sender_email: payload.sender_email.trim(),
      body: payload.body.trim(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}
