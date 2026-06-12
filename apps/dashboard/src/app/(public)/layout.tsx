import { createClient } from '@/lib/supabase/server'
import { PublicShell } from '@/components/public/PublicShell'
import type { HeaderNotification } from '@/components/dashboard/GlobalHeader'
import { getEntityByUserId, getNotifications, getUnreadCount } from '@ibee/supabase'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  let entity: { displayName: string; slug: string; avatarUrl: string | null } | null = null
  let unreadCount = 0
  let notifications: HeaderNotification[] = []

  if (user) {
    const row = await getEntityByUserId(supabase, user.id)
    if (row) {
      entity = {
        displayName: row.display_name,
        slug: row.slug,
        avatarUrl: row.avatar_url,
      }
      ;[unreadCount, notifications] = await Promise.all([
        getUnreadCount(supabase, user.id),
        getNotifications(supabase, user.id, { limit: 5 }),
      ])
    }
  }

  return (
    <PublicShell
      entity={entity}
      unreadCount={unreadCount}
      notifications={notifications as HeaderNotification[]}
      webUrl={webUrl}
    >
      {children}
    </PublicShell>
  )
}
