import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listMyApplications } from '@ibee/supabase'
import { ApplicationsList } from '@/components/account/ApplicationsList'

export default async function MesCandidaturesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const applications = await listMyApplications(supabase, user.id)

  return <ApplicationsList applications={applications} />
}
