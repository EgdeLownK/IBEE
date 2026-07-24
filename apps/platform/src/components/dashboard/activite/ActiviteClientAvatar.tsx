function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type Props = {
  name: string
  className?: string
}

export function ActiviteClientAvatar({ name, className = '' }: Props) {
  return (
    <div className={`activite-client-avatar${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span>{clientInitials(name)}</span>
    </div>
  )
}
