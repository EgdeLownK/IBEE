'use client'

import { Suspense, useEffect, type ReactNode } from 'react'
import { useDashboardNavigation } from './DashboardNavigationContext'
import { DashboardPageSkeleton } from './DashboardPageSkeleton'

export function DashboardContentArea({ children }: { children: ReactNode }) {
  const { isNavigating } = useDashboardNavigation()

  if (isNavigating) {
    return <DashboardPageSkeleton />
  }

  return <Suspense fallback={<DashboardPageSkeleton />}>{children}</Suspense>
}
