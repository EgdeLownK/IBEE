'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertUserProfile } from '@ibee/supabase'

export async function upsertUserProfileAction(input: {
  first_name?: string
  last_name?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Non authentifié' }

  try {
    await upsertUserProfile(supabase, user.id, input)
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return { error: message }
  }
}
