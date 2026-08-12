'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { useRouter } from 'next/navigation'
import { useDashboardNavigation } from './DashboardNavigationContext'
import { closeAppDrawer } from './MainRail'

type Props = {
  href: string
  label: string
  className: string
  children: ReactNode
  onClick?: () => void
}

function NavPendingReporter() {
  const { pending } = useLinkStatus()
  const { setLinkPending } = useDashboardNavigation()

  useEffect(() => {
    setLinkPending(pending)
  }, [pending, setLinkPending])

  return null
}

export function DashboardNavLink({ href, label, className, children, onClick }: Props) {
  const router = useRouter()

  return (
    <Link
      href={href}
      prefetch
      className={className}
      title={label}
      aria-label={label}
      onMouseEnter={() => router.prefetch(href)}
      onClick={() => {
        onClick?.()
        if (window.innerWidth < 1200) closeAppDrawer()
      }}
    >
      <NavPendingReporter />
      {children}
    </Link>
  )
}
