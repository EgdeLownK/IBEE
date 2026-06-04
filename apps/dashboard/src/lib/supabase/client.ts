import { createBrowserClient } from '@ibee/supabase/auth/browser'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient()
}
