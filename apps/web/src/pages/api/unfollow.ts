import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { unfollowEntity, getEntityBySlug, purgeEntityCache } from '@ibee/supabase'

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { entityId, slug } = await request.json()
  if (!entityId || !slug) {
    return new Response(JSON.stringify({ error: 'Missing entityId or slug' }), { status: 400 })
  }

  try {
    await unfollowEntity(authClient, user.id, entityId)

    const entity = await getEntityBySlug(authClient, slug)
    const siteUrl = import.meta.env.SITE_URL ?? ''
    await purgeEntityCache(slug, siteUrl)

    return new Response(JSON.stringify({
      is_following: false,
      followers_count: entity?.followers_count ?? 0,
    }))
  } catch (err) {
    console.error('[api/unfollow]', err)
    return new Response(JSON.stringify({ error: 'Unfollow failed' }), { status: 500 })
  }
}
