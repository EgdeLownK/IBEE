import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markAllAsRead } from '@ibee/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await markAllAsRead(supabase, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/notifications/mark-all-read]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
