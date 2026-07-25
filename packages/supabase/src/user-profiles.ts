import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

type Client = SupabaseClient<Database>

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export async function getUserProfile(client: Client, userId: string): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserProfile(
  client: Client,
  userId: string,
  input: {
    first_name?: string | null
    last_name?: string | null
    default_resume_url?: string | null
  }
): Promise<UserProfile> {
  const { data, error } = await client
    .from('user_profiles')
    .upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}
