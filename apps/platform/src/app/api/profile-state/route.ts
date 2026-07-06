import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFollowing as checkIsFollowing } from '@ibee/supabase'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const entityId = searchParams.get('entityId')
    const ownerId = searchParams.get('ownerId')

    if (!entityId) {
      return NextResponse.json({ error: 'entityId requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        isAuthenticated: false,
        isFollowing: false,
        isOwner: false,
      })
    }

    const [isFollowing] = await Promise.all([
      checkIsFollowing(supabase, user.id, entityId),
    ])

    const isOwner = !!(ownerId && user.id === ownerId)

    return NextResponse.json({
      isAuthenticated: true,
      isFollowing,
      isOwner,
    })
  } catch (err) {
    console.error('[profile-state]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
