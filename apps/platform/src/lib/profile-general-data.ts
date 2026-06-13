import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@ibee/supabase'

export async function loadProfileGeneralData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return null

  const row = entity as typeof entity & { banner_url?: string | null }
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  return {
    entity: {
      id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      role: entity.role,
      bio: entity.bio,
      location: entity.location,
      avatar_url: entity.avatar_url,
      banner_url: row.banner_url ?? null,
    },
    studioUrl: '/dashboard/site',
    publicProfileUrl: `${webUrl}/${entity.slug}`,
    profileUrlDisplay: `www.ibee-pro.com/${entity.slug}`,
  }
}

export type ProfileGeneralData = NonNullable<Awaited<ReturnType<typeof loadProfileGeneralData>>>
