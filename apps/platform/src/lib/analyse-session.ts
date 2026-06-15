import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type AnalyseSession = {
  supabase: Awaited<ReturnType<typeof createClient>>
  entityId: string
}

/** Auth légère pour les actions Analyse — évite getEntityByUserId(*) à chaque clic. */
export async function getAnalyseSession(entityId: string): Promise<AnalyseSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('entity')
    .select('id')
    .eq('id', entityId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null

  return { supabase, entityId: data.id }
}
