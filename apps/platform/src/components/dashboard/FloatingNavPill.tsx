'use client'

import type { ReactNode } from 'react'
import { Activity, Home, MessageCircle, PanelsTopLeft } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  isActive?: boolean
}

interface Props {
  webProfileUrl: string
  webProfileActive: boolean
  currentPath?: string
  isAuthenticated?: boolean
  loginUrl?: string
}

export function FloatingNavPill({
  webProfileUrl,
  webProfileActive,
  currentPath = '/',
  isAuthenticated = true,
  loginUrl = '/login',
}: Props) {
  const profileHref = isAuthenticated ? webProfileUrl : loginUrl

  const items: NavItem[] = [
    {
      href: '/',
      label: 'Home',
      icon: <Home className="h-5 w-5" aria-hidden="true" />,
      isActive: currentPath === '/',
    },
    {
      href: '#messages',
      label: 'Message',
      icon: <MessageCircle className="h-5 w-5" aria-hidden="true" />,
    },
    {
      href: '/notifications',
      label: 'Activité',
      icon: <Activity className="h-5 w-5" aria-hidden="true" />,
      isActive: currentPath.startsWith('/notifications'),
    },
    {
      href: profileHref,
      label: 'Profile web',
      icon: <PanelsTopLeft className="h-5 w-5" aria-hidden="true" />,
      isActive: webProfileActive,
    },
  ]

  return (
    <nav className="navpill" aria-label="Navigation rapide">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          aria-label={item.label}
          aria-current={item.isActive ? 'page' : undefined}
          className={`navpill__btn${item.isActive ? ' is-active' : ''}`}
        >
          {item.icon}
        </a>
      ))}
    </nav>
  )
}
