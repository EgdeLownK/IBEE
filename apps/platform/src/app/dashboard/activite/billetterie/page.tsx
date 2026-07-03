import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { BilletterieDashboard } from '@/components/dashboard/activite/BilletterieDashboard'
import { getActivityCapabilities, isActivityModuleEnabled } from '@/lib/activity-capabilities'
import { resolveActivityLandingPath, getActivityModuleLabel } from '@/lib/activity-modules'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadBilletterieDashboardData } from '@/lib/load-billetterie-data'

export async function generateMetadata(): Promise<Metadata> {
  return { title: getActivityModuleLabel('events') }
}

export default async function ActiviteBilletteriePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  if (!isActivityModuleEnabled(capabilities, 'events')) redirect(resolveActivityLandingPath(capabilities))

  const data = await loadBilletterieDashboardData(
    ctx.supabase,
    ctx.entity.id,
    ctx.entity.slug
  )

  return (
    <Suspense fallback={null}>
      <BilletterieDashboard data={data} />
    </Suspense>
  )
}
