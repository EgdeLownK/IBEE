import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface Props {
  displayName: string
  avatarUrl: string | null
  bannerUrl?: string | null
  profileHref: string
  title: string
  subtitle?: string | null
  /** Prix affiché à droite du strip (desktop). */
  priceText?: string | null
  /** CTA visiteur (ex. Réserver, Participer). */
  ctaHref?: string | null
  ctaLabel?: string
  /** CTA React custom (ex. checkout Stripe). Prioritaire sur ctaHref. */
  ctaSlot?: ReactNode
}

export function DetailEntityStrip({
  displayName,
  avatarUrl,
  bannerUrl = null,
  profileHref,
  title,
  subtitle,
  priceText = null,
  ctaHref = null,
  ctaLabel = 'Voir',
  ctaSlot = null,
}: Props) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  return (
    <header className="detail-entity-strip" aria-label={`Profil de ${displayName}`}>
      <div className="profile-banner">
        {bannerUrl ? (
          <Image src={bannerUrl} alt="" className="h-full w-full object-cover" width={800} height={172} priority />
        ) : (
          <div className="profile-banner__placeholder profile-banner__placeholder--empty" aria-hidden="true" />
        )}
      </div>

      <div className="detail-entity-strip__avatar px-[22px] pb-0">
        <div className="detail-entity-strip__group">
          <Link href={profileHref} className="profile-avatar" aria-label={`Voir le profil de ${displayName}`}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={172} height={172} className="h-full w-full object-cover" priority />
            ) : (
              <span className="font-display text-[30px] font-semibold text-accent">{initials}</span>
            )}
          </Link>

          <div className="detail-entity-strip__id">
            <h1 className="detail-entity-strip__title">{title}</h1>
            {subtitle && <p className="detail-entity-strip__subtitle">{subtitle}</p>}
          </div>
        </div>

        {(ctaSlot || ctaHref) && (
          <div className="detail-entity-strip__buy">
            {priceText && <span className="detail-entity-strip__price">{priceText}</span>}
            {ctaSlot ?? (
              <Link href={ctaHref!} className="detail-entity-strip__cta">
                {ctaLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
