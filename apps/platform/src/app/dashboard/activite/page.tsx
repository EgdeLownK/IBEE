import { redirect } from 'next/navigation'
import { getActivityCapabilities } from '@/lib/activity-capabilities'
import { getDashboardContext } from '@/lib/dashboard-context'
import { resolveActivityLandingPath } from '@/lib/activity-modules'

export default async function ActivitePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  redirect(resolveActivityLandingPath(capabilities))
}
