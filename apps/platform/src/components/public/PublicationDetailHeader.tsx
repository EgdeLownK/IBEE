import Link from 'next/link'

interface Props {
  title: string
  subtitle: string
  publishedAt: string
  dateTitle?: string
  displayName: string
  avatarUrl: string | null
  profileHref: string
}

export function PublicationDetailHeader({
  title,
  subtitle,
  publishedAt,
  dateTitle,
  displayName,
  avatarUrl,
  profileHref,
}: Props) {
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="pub-detail-header" aria-label={`Publication : ${title}`}>
      <div className="pub-detail-header__row">
        <div className="pub-detail-header__group">
          <Link
            href={profileHref}
            className="pub-detail-header__avatar"
            aria-label={`Voir le profil de ${displayName}`}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-accent">{initial}</span>
            )}
          </Link>

          <div className="pub-detail-header__id">
            <h1 className="pub-detail-header__title">{title}</h1>
            <time dateTime={publishedAt} title={dateTitle} className="pub-detail-header__meta">
              {subtitle}
            </time>
          </div>
        </div>
      </div>
    </header>
  )
}
