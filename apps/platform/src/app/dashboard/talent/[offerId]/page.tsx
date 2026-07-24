import { redirect } from 'next/navigation'
import { getProjectJobOffer, listJobApplications } from '@ibee/supabase'
import { getDashboardContext } from '@/lib/dashboard-context'
import { JobOfferDetails } from '../../../../components/dashboard/talent/JobOfferDetails'

export default async function JobOfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const ctx = await getDashboardContext()

  if (!ctx) {
    redirect('/login')
  }

  const { offerId } = await params
  const offer = await getProjectJobOffer(ctx.supabase, ctx.entity.id, offerId)
  const applications = await listJobApplications(ctx.supabase, offerId)

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <JobOfferDetails entityId={ctx.entity.id} offer={offer} applications={applications} />
    </div>
  )
}
