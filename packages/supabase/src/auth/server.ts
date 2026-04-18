import { createServerClient as _createServerClient } from '@supabase/ssr'
import type { Database } from '../types'
import { getSupabaseEnv } from './env'

interface CookieAdapter {
  getAll: () => { name: string; value: string }[]
  setAll: (
    cookies: { name: string; value: string; options?: Record<string, unknown> }[]
  ) => void
}

export function createServerClient(config: { cookies: CookieAdapter }) {
  const { url, anonKey } = getSupabaseEnv()
  return _createServerClient<Database>(url, anonKey, {
    cookies: config.cookies,
  })
}
