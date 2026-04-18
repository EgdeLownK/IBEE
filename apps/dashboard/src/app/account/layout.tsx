import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, getUnreadCount } from '@agora/supabase'
import { MainRail } from '@/components/dashboard/MainRail'
import { GlobalHeader } from '@/components/dashboard/GlobalHeader'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [entity, unreadCount] = await Promise.all([
    getEntityByUserId(supabase, user.id),
    getUnreadCount(supabase, user.id),
  ])
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'
  const profileUrl = entity ? `${webUrl}/${entity.slug}` : undefined

  return (
    <div className="flex h-screen bg-background">
      <MainRail webUrl={webUrl} />
      <div className="flex flex-1 flex-col min-w-0">
        <GlobalHeader
          profileUrl={profileUrl}
          avatarUrl={entity?.avatar_url}
          displayName={entity?.display_name}
          unreadCount={unreadCount}
          webUrl={webUrl}
        />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
