import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, getNotifications, getUnreadCount } from '@ibee/supabase'
import { AppShell } from '@/components/dashboard/AppShell'
import type { HeaderNotification } from '@/components/dashboard/GlobalHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  const [unreadCount, notifications] = await Promise.all([
    getUnreadCount(supabase, user.id),
    getNotifications(supabase, user.id, { limit: 5 }),
  ])

  return (
    <AppShell
      displayName={entity.display_name}
      slug={entity.slug}
      avatarUrl={entity.avatar_url}
      webUrl={webUrl}
      unreadCount={unreadCount}
      notifications={notifications as HeaderNotification[]}
    >
      {children}
    </AppShell>
  )
}
