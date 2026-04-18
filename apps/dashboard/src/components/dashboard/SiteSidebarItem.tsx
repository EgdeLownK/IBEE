type Props = {
  icon: React.ReactNode
  label: string
  href: string
  isActive: boolean
  available?: boolean
}

export function SiteSidebarItem({ icon, label, href, isActive, available = true }: Props) {
  if (!available) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-400 opacity-50 cursor-not-allowed"
        title="Disponible prochainement"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
          Bientôt
        </span>
      </div>
    )
  }

  return (
    <a
      href={href}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
        ${isActive
          ? 'bg-accent-soft text-accent'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
        }
      `}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  )
}
