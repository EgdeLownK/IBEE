import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { BoutiqueDashboard } from '@/components/dashboard/activite/BoutiqueDashboard'
import { getActivityCapabilities, isActivityModuleEnabled } from '@/lib/activity-capabilities'
import { resolveActivityLandingPath, getActivityModuleLabel } from '@/lib/activity-modules'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadBoutiqueDashboardData } from '@/lib/load-boutique-data'

export async function generateMetadata(): Promise<Metadata> {
  return { title: getActivityModuleLabel('shop') }
}

export default async function ActiviteBoutiquePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  if (!isActivityModuleEnabled(capabilities, 'shop'))
    redirect(resolveActivityLandingPath(capabilities))

  const data = await loadBoutiqueDashboardData(ctx.supabase, ctx.entity.id)

  return (
    <Suspense fallback={null}>
      <BoutiqueDashboard
        data={data}
        senderName={ctx.entity.display_name?.trim() || ctx.entity.slug}
      />
    </Suspense>
  )
}
