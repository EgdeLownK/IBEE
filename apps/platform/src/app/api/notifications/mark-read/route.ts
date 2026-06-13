import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markAsRead } from '@ibee/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { notificationId } = body

  if (!notificationId) {
    return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 })
  }

  try {
    await markAsRead(supabase, notificationId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/notifications/mark-read]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
