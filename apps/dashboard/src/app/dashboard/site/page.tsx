import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { loadProfileStudioData } from '@/lib/profile-studio-data'
import { ProfileStudio } from '@/components/profile/ProfileStudio'

export const metadata: Metadata = {
  title: 'Mon site',
}

export default async function SiteStudioPage() {
  const data = await loadProfileStudioData()
  if (!data) redirect('/login')

  return <ProfileStudio data={data} />
}
