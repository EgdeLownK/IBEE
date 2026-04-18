import { createBrowserClient } from '@agora/supabase/auth/browser'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@agora/supabase'

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient()
}
