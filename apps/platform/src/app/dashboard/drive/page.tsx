import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { DriveDashboard } from '@/components/dashboard/drive/DriveDashboard'
import { DrivePageSkeleton } from '@/components/dashboard/drive/DrivePageSkeleton'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadDrivePageDataFromContext } from '@/lib/drive-page-data'
import { measureDashboardLoad } from '@/lib/dashboard-perf'

export const metadata: Metadata = {
  title: 'Drive',
}

async function DrivePageLoader() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const data = await measureDashboardLoad('page:drive', () =>
    loadDrivePageDataFromContext(ctx)
  )

  return <DriveDashboard data={data} />
}

export default function DrivePage() {
  return (
    <Suspense fallback={<DrivePageSkeleton />}>
      <DrivePageLoader />
    </Suspense>
  )
}
