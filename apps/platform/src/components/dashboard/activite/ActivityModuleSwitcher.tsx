'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { resolveActiveActivityModules, type ActivityCapabilitiesView } from '@/lib/activity-modules'

type Props = {
  capabilities: ActivityCapabilitiesView
}

function shouldHideSwitcher(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard/revenus') ||
    pathname.startsWith('/dashboard/billetterie/check-in')
  )
}

export function ActivityModuleSwitcher({ capabilities }: Props) {
  const pathname = usePathname() ?? ''
  const modules = resolveActiveActivityModules(capabilities)

  if (modules.length < 2 || shouldHideSwitcher(pathname)) return null

  return (
    <nav className="activity-module-nav-wrap" aria-label="Changer de module">
      <div className="activity-module-nav" role="tablist">
        {modules.map((module) => {
          const Icon = module.icon
          const isActive = module.matchPath(pathname)
          return (
            <Link
              key={module.key}
              href={module.href}
              className={`activity-module-nav__item${isActive ? ' is-active' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {module.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
