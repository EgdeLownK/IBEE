type Props = {
  label: string
  children: React.ReactNode
}

export function SiteSidebarGroup({ label, children }: Props) {
  return (
    <div>
      <p className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        {label}
      </p>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}
