import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { RevenuProjetDashboard } from '@/components/dashboard/revenu/RevenuProjetDashboard'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadRevenuProjetData } from '@/lib/load-revenu-projet-data'

export const metadata: Metadata = {
  title: 'Revenus projet',
}

export default async function RevenusProjetRoute() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const data = await loadRevenuProjetData(ctx.supabase, ctx.entity.id, {
    name: ctx.entity.display_name,
    email: ctx.user.email ?? '',
  })

  return <RevenuProjetDashboard data={data} />
}
