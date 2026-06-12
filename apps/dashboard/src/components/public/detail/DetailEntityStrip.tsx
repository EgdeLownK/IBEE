import Link from 'next/link'

interface Props {
  displayName: string
  avatarUrl: string | null
  profileHref: string
  title: string
  subtitle?: string | null
}

export function DetailEntityStrip({ displayName, avatarUrl, profileHref, title, subtitle }: Props) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  return (
    <header className="detail-entity-strip" aria-label={`Profil de ${displayName}`}>
      <div className="profile-banner">
        <div className="profile-banner__placeholder" aria-hidden="true">
          <span className="profile-banner__label">BANNER IMAGE 800×172</span>
        </div>
      </div>

      <div className="detail-entity-strip__avatar px-[22px] pb-0">
        <div className="detail-entity-strip__group">
          <Link href={profileHref} className="profile-avatar" aria-label={`Voir le profil de ${displayName}`}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" width={172} height={172} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[30px] font-semibold text-accent">{initials}</span>
            )}
          </Link>

          <div className="detail-entity-strip__id">
            <h1 className="detail-entity-strip__title">{title}</h1>
            {subtitle && <p className="detail-entity-strip__subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
    </header>
  )
}
