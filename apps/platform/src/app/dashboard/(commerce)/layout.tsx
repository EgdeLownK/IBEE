import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityOverlayProvider } from '@/components/dashboard/activite/ActivityOverlayProvider'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadActivityOverlayData } from '@/lib/load-activity-overlay-data'

export default async function CommerceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const overlayData = await loadActivityOverlayData(ctx.supabase, ctx.entity.id)

  return (
    <Suspense fallback={null}>
      <ActivityOverlayProvider productCategories={overlayData.productCategories}>
        <div className="activity-layout">{children}</div>
      </ActivityOverlayProvider>
    </Suspense>
  )
}
