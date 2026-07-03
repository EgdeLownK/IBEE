import { createClient } from '@/lib/supabase/server'
import { getHomeFeedPage } from '@/lib/home-feed'
import type { HomeFeedPage } from '@ibee/shared'

export async function loadHomeFeedInitialPage(): Promise<HomeFeedPage> {
  const supabase = await createClient()
  return getHomeFeedPage(supabase, { limit: 12 })
}
