import { createClient } from '@/lib/supabase/server'
import { PublicShell } from '@/components/public/PublicShell'
import type { HeaderNotification } from '@/components/dashboard/GlobalHeader'
import { getNotifications, getUnreadCount } from '@ibee/supabase'
import { loadAccountShellData } from '@/lib/account-shell-data'
import type { AccountShellData } from '@/lib/account-shell-data'

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

  let accountData: AccountShellData | null = null
  let unreadCount = 0
  let notifications: HeaderNotification[] = []

  if (user) {
    accountData = await loadAccountShellData(supabase)
    if (accountData) {
      ;[unreadCount, notifications] = await Promise.all([
        getUnreadCount(supabase, user.id),
        getNotifications(supabase, user.id, { limit: 5 }),
      ])
    }
  }

  return (
    <PublicShell
      accountData={accountData}
      unreadCount={unreadCount}
      notifications={notifications as HeaderNotification[]}
      webUrl={webUrl}
    >
      {children}
    </PublicShell>
  )
}
