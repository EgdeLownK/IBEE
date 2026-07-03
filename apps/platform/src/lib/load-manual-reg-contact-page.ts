import { createClient } from '@/lib/supabase/server'
import { getManualRegContactSessionPublic } from '@ibee/supabase'

export type ManualRegContactPageData = {
  token: string
  eventTitle: string
  entityName: string
  alreadyFilled: boolean
}

export async function loadManualRegContactPage(
  token: string
): Promise<ManualRegContactPageData | null> {
  const trimmed = token.trim()
  if (!trimmed) return null

  const supabase = await createClient()
  const session = await getManualRegContactSessionPublic(supabase, trimmed)
  if (!session) return null

  return {
    token: trimmed,
    eventTitle: session.eventTitle,
    entityName: session.entityName,
    alreadyFilled: session.status === 'filled',
  }
}
