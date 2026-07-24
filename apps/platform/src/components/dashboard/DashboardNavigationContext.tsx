'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

type DashboardNavigationContextValue = {
  isNavigating: boolean
  setLinkPending: (pending: boolean) => void
  startNavigation: () => void
}

const DashboardNavigationContext = createContext<DashboardNavigationContextValue | null>(null)

export function DashboardNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const [linkPending, setLinkPending] = useState(false)
  const [manualPending, setManualPending] = useState(false)

  useEffect(() => {
    setManualPending(false)
    setLinkPending(false)
  }, [pathname])

  const setLinkPendingStable = useCallback((pending: boolean) => {
    setLinkPending(pending)
  }, [])

  const startNavigation = useCallback(() => {
    setManualPending(true)
  }, [])

  const value = useMemo(
    () => ({
      isNavigating: linkPending || manualPending,
      setLinkPending: setLinkPendingStable,
      startNavigation,
    }),
    [linkPending, manualPending, setLinkPendingStable, startNavigation],
  )

  return (
    <DashboardNavigationContext.Provider value={value}>
      {children}
    </DashboardNavigationContext.Provider>
  )
}

export function useDashboardNavigation() {
  const ctx = useContext(DashboardNavigationContext)
  if (!ctx) {
    throw new Error('useDashboardNavigation must be used within DashboardNavigationProvider')
  }
  return ctx
}

export function useOptionalDashboardNavigation() {
  return useContext(DashboardNavigationContext)
}
