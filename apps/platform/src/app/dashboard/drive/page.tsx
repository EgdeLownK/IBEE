import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DriveDashboard } from '@/components/dashboard/drive/DriveDashboard'
import { loadDrivePageData } from '@/lib/drive-page-data'
import { measureDashboardLoad } from '@/lib/dashboard-perf'

export const metadata: Metadata = {
  title: 'Drive',
}

export default async function DrivePage() {
  const data = await measureDashboardLoad('page:drive', () => loadDrivePageData())
  if (!data) redirect('/login')

  return <DriveDashboard data={data} />
}
