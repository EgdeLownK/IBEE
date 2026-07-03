'use client'

import { Suspense, useEffect, type ReactNode } from 'react'
import { useDashboardNavigation } from './DashboardNavigationContext'
import { DashboardPageSkeleton } from './DashboardPageSkeleton'

export function DashboardContentArea({ children }: { children: ReactNode }) {
  const { isNavigating } = useDashboardNavigation()

  if (isNavigating) {
    return (
      <div className="dashboard-content-area flex min-h-0 flex-1 flex-col">
        <DashboardPageSkeleton />
      </div>
    )
  }

  return (
    <div className="dashboard-content-area flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<DashboardPageSkeleton />}>{children}</Suspense>
    </div>
  )
}
