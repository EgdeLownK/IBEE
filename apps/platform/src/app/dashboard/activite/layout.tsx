import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ActivityModuleSwitcher } from '@/components/dashboard/activite/ActivityModuleSwitcher'
import { ActivityOverlayProvider } from '@/components/dashboard/activite/ActivityOverlayProvider'
import { getActivityCapabilities } from '@/lib/activity-capabilities'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadActivityOverlayData } from '@/lib/load-activity-overlay-data'

export default async function ActiviteLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const [capabilities, overlayData] = await Promise.all([
    getActivityCapabilities(ctx.supabase, ctx.entity.id),
    loadActivityOverlayData(ctx.supabase, ctx.entity.id),
  ])

  return (
    <Suspense fallback={null}>
      <ActivityOverlayProvider productCategories={overlayData.productCategories}>
        <div className="activity-layout">
          <ActivityModuleSwitcher capabilities={capabilities} />
          {children}
        </div>
      </ActivityOverlayProvider>
    </Suspense>
  )
}
