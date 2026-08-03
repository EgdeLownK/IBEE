import { redirect } from 'next/navigation'
import { listProjectJobOffers, listJobSectors } from '@ibee/supabase'
import { TalentDashboard } from '../../../components/dashboard/talent/TalentDashboard'
import { getDashboardContext } from '@/lib/dashboard-context'

export default async function TalentPage() {
  const ctx = await getDashboardContext()

  if (!ctx) {
    redirect('/login')
  }

  const [offers, sectors] = await Promise.all([
    listProjectJobOffers(ctx.supabase, ctx.entity.id),
    listJobSectors(ctx.supabase),
  ])

  return <TalentDashboard entityId={ctx.entity.id} offers={offers} sectors={sectors} />
}
