import type { APIRoute } from 'astro'
import { createAuthClient } from '../../../lib/supabase/auth'
import { markAllAsRead } from '@ibee/supabase'

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    await markAllAsRead(authClient, user.id)
    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('[mark-all-read]', err)
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 })
  }
}
