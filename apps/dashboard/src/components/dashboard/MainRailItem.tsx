'use client'

import { usePathname } from 'next/navigation'

type Props = {
  icon: React.ReactNode
  label: string
  href: string
  isExpanded: boolean
  isExternal?: boolean
}

export function MainRailItem({ icon, label, href, isExpanded, isExternal }: Props) {
  const pathname = usePathname()
  const isActive = !isExternal && pathname.startsWith(href)

  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      title={!isExpanded ? label : undefined}
      className={`
        group/item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
        ${isActive
          ? 'bg-neutral-100 text-neutral-900'
          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
        }
      `}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      {isExpanded && <span className="truncate">{label}</span>}
    </a>
  )
}
