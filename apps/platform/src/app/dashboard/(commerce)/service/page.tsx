import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ServiceDashboard } from '@/components/dashboard/activite/ServiceDashboard'
import { getActivityCapabilities, isActivityModuleEnabled } from '@/lib/activity-capabilities'
import { resolveActivityLandingPath, getActivityModuleLabel } from '@/lib/activity-modules'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadServiceDashboardData } from '@/lib/load-service-data'

export async function generateMetadata(): Promise<Metadata> {
  return { title: getActivityModuleLabel('appointments') }
}

export default async function ActiviteServicePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  if (!isActivityModuleEnabled(capabilities, 'appointments'))
    redirect(resolveActivityLandingPath(capabilities))

  const data = await loadServiceDashboardData(ctx.supabase, ctx.entity.id)

  return (
    <Suspense fallback={null}>
      <ServiceDashboard data={data} />
    </Suspense>
  )
}
