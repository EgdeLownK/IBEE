'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, Home, MessageCircle, PanelsTopLeft } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  isActive?: boolean
  external?: boolean
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
  const router = useRouter()
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
      external: true,
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
      {items.map((item) => {
        const className = `navpill__btn${item.isActive ? ' is-active' : ''}`

        if (item.external || item.href.startsWith('#')) {
          return (
            <a
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={item.isActive ? 'page' : undefined}
              className={className}
            >
              {item.icon}
            </a>
          )
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch
            aria-label={item.label}
            aria-current={item.isActive ? 'page' : undefined}
            className={className}
            onMouseEnter={() => router.prefetch(item.href)}
          >
            {item.icon}
          </Link>
        )
      })}
    </nav>
  )
}
