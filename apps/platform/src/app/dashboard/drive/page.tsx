import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DriveDashboard } from '@/components/dashboard/drive/DriveDashboard'
import { loadDrivePageData } from '@/lib/drive-data'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Drive',
}

export default async function DrivePage() {
  const supabase = await createClient()
  const data = await loadDrivePageData(supabase)
  if (!data) redirect('/login')

  return <DriveDashboard data={data} />
}
