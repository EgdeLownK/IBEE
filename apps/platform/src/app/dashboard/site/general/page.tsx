import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { GeneralSettingsForm } from '@/components/profile/general/GeneralSettingsForm'
import { loadProfileGeneralData } from '@/lib/profile-general-data'

export const metadata: Metadata = {
  title: 'Réglages généraux',
}

export default async function SiteGeneralPage() {
  const data = await loadProfileGeneralData()
  if (!data) redirect('/login')

  return <GeneralSettingsForm data={data} />
}
