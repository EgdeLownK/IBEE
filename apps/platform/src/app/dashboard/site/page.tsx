import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { loadProfileStudioShell } from '@/lib/profile-studio-data'
import { measureDashboardLoad } from '@/lib/dashboard-perf'
import { ProfileStudio } from '@/components/profile/ProfileStudio'
import { ProfileStudioDataProvider } from '@/components/profile/ProfileStudioDataContext'
import { ProfileStudioPlaylistsSlot } from '@/components/profile/ProfileStudioPlaylistsSlot'

export const metadata: Metadata = {
  title: 'Mon site',
}

export default async function SiteStudioPage() {
  const shell = await measureDashboardLoad('page:site-shell', () => loadProfileStudioShell())
  if (!shell) redirect('/login')

  return (
    <ProfileStudioDataProvider shell={shell}>
      <ProfileStudio />
      <Suspense fallback={null}>
        <ProfileStudioPlaylistsSlot />
      </Suspense>
    </ProfileStudioDataProvider>
  )
}
