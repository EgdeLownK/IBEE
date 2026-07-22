import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@ibee/supabase'
import { AccountPage } from '@/components/account/AccountPage'

export default async function MonComptePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(supabase, user.id)

  return <AccountPage user={user} profile={profile} />
}
