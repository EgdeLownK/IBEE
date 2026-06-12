import { createClient } from '@ibee/supabase'

export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requis')
  }
  return createClient(url, anonKey)
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
}
