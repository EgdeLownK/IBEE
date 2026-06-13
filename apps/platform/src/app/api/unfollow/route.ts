import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePublicPaths } from '@/lib/revalidate-public'
import { getEntityBySlug, unfollowEntity } from '@ibee/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { entityId, slug } = body

  if (!entityId || !slug) {
    return NextResponse.json({ error: 'Missing entityId or slug' }, { status: 400 })
  }

  try {
    await unfollowEntity(supabase, user.id, entityId)

    const entity = await getEntityBySlug(supabase, slug)
    revalidatePublicPaths(slug)

    return NextResponse.json({
      is_following: false,
      followers_count: entity?.followers_count ?? 0,
    })
  } catch (err) {
    console.error('[api/unfollow]', err)
    return NextResponse.json({ error: 'Unfollow failed' }, { status: 500 })
  }
}
