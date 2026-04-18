import type { APIRoute } from 'astro'
import { createAuthClient } from '../../../lib/supabase/auth'
import { markAsRead } from '@agora/supabase'

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { notificationId } = await request.json()
  if (!notificationId) {
    return new Response(JSON.stringify({ error: 'Missing notificationId' }), { status: 400 })
  }

  try {
    await markAsRead(authClient, notificationId)
    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('[mark-read]', err)
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 })
  }
}
