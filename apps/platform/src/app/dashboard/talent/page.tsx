import { redirect } from 'next/navigation'
import { listProjectJobOffers } from '@ibee/supabase'
import { TalentDashboard } from '../../../components/dashboard/talent/TalentDashboard'
import { getDashboardContext } from '@/lib/dashboard-context'

export default async function TalentPage() {
  const ctx = await getDashboardContext()
  
  if (!ctx) {
    redirect('/login')
  }

  const offers = await listProjectJobOffers(ctx.supabase, ctx.entity.id)

  return <TalentDashboard entityId={ctx.entity.id} offers={offers} />
}
