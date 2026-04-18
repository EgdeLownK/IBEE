import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types'
import { getSupabaseEnv } from './env'

export function createBrowserClient() {
  const { url, anonKey } = getSupabaseEnv()
  return _createBrowserClient<Database>(url, anonKey)
}
