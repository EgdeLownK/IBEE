import 'server-only'

import { getEventBySlug, getEventEntreePublicStats } from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'

export async function loadEventEntreePage(entitySlug: string, eventSlug: string) {
  const supabase = await createClient()

  const { data: entity } = await supabase
    .from('entity')
    .select('id, slug, display_name')
    .eq('slug', entitySlug)
    .maybeSingle()

  if (!entity) return null

  const event = await getEventBySlug(supabase, entity.id, eventSlug)
  if (!event || !event.is_published) return null

  const stats = await getEventEntreePublicStats(supabase, event.id)

  return {
    entity: {
      slug: entity.slug,
      displayName: entity.display_name,
    },
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      startAt: event.start_at,
    },
    stats: stats ?? { confirmedCount: 0, checkedInCount: 0 },
  }
}

export type EventEntreePageData = NonNullable<Awaited<ReturnType<typeof loadEventEntreePage>>>
