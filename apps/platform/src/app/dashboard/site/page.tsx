import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { loadProfileStudioShell } from '@/lib/profile-studio-data'
import { measureDashboardLoad } from '@/lib/dashboard-perf'
import { ProfileStudio } from '@/components/profile/ProfileStudio'
import { ProfileStudioDataProvider } from '@/components/profile/ProfileStudioDataContext'
import { ProfileStudioPlaylistsSlot } from '@/components/profile/ProfileStudioPlaylistsSlot'
import { ProfileStudioPageSkeleton } from '@/components/profile/ProfileStudioPageSkeleton'
import { StudioPlaylistsSkeleton } from '@/components/profile/StudioPlaylistsSkeleton'

export const metadata: Metadata = {
  title: 'Mon site',
}

async function ProfileStudioPageLoader() {
  const shell = await measureDashboardLoad('page:site-shell', () => loadProfileStudioShell())
  if (!shell) redirect('/login')

  return (
    <ProfileStudioDataProvider shell={shell}>
      <ProfileStudio />
      <Suspense fallback={<StudioPlaylistsSkeleton />}>
        <ProfileStudioPlaylistsSlot />
      </Suspense>
    </ProfileStudioDataProvider>
  )
}

export default function SiteStudioPage() {
  return (
    <Suspense fallback={<ProfileStudioPageSkeleton />}>
      <ProfileStudioPageLoader />
    </Suspense>
  )
}
