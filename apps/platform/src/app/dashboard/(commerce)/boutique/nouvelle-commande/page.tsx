import { redirect } from 'next/navigation'
import { getActivityCapabilities, isActivityModuleEnabled } from '@/lib/activity-capabilities'
import { resolveActivityLandingPath } from '@/lib/activity-modules'
import { getDashboardContext } from '@/lib/dashboard-context'

export default async function NouvelleCommandePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  if (!isActivityModuleEnabled(capabilities, 'shop')) redirect(resolveActivityLandingPath(capabilities))

  redirect('/dashboard/boutique?overlay=order')
}
