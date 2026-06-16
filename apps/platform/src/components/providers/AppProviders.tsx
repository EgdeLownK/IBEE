'use client'

import type { ReactNode } from 'react'
import { DashboardNavigationProvider } from '@/components/dashboard/DashboardNavigationContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return <DashboardNavigationProvider>{children}</DashboardNavigationProvider>
}
