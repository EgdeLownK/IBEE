import { redirect } from 'next/navigation'
import { getActivityCapabilities, isActivityModuleEnabled } from '@/lib/activity-capabilities'
import { resolveActivityLandingPath } from '@/lib/activity-modules'
import { getDashboardContext } from '@/lib/dashboard-context'

export default async function NouveauRendezVousPage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  if (!isActivityModuleEnabled(capabilities, 'appointments')) {
    redirect(resolveActivityLandingPath(capabilities))
  }

  redirect('/dashboard/activite/service?overlay=booking')
}
