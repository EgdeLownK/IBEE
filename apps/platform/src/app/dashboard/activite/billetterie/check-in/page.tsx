import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BilletterieCheckInDashboard } from '@/components/dashboard/activite/BilletterieCheckInDashboard'
import { getActivityCapabilities, isActivityModuleEnabled } from '@/lib/activity-capabilities'
import { resolveActivityLandingPath, getActivityModuleLabel } from '@/lib/activity-modules'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadBilletterieCheckInData } from '@/lib/load-billetterie-checkin'

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Check-in · ${getActivityModuleLabel('events')}` }
}

type Props = {
  searchParams: Promise<{ eventId?: string; scan?: string }>
}

export default async function BilletterieCheckInPage({ searchParams }: Props) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const capabilities = await getActivityCapabilities(ctx.supabase, ctx.entity.id)
  if (!isActivityModuleEnabled(capabilities, 'events')) redirect(resolveActivityLandingPath(capabilities))

  const params = await searchParams
  const data = await loadBilletterieCheckInData(
    ctx.supabase,
    ctx.entity.id,
    params.eventId ?? null
  )

  return (
    <BilletterieCheckInDashboard
      data={data}
      preferScanMode={params.scan === '1'}
    />
  )
}
