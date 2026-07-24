'use client'

import { Pencil, Plus, Share } from 'lucide-react'

export interface ProfileHeroViewProps {
  displayName: string
  role: string | null
  bio: string | null
  avatarUrl: string | null
  followersCount: number
  /** Phase 1 : boutons désactivés visuellement (lecture seule). */
  readOnly?: boolean
  onAddContent?: () => void
  onEditProfile?: () => void
}

export function ProfileHeroView({
  displayName,
  role,
  bio,
  avatarUrl,
  followersCount,
  readOnly = true,
  onAddContent,
  onEditProfile,
}: ProfileHeroViewProps) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  const followersDisplay = new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(followersCount)

  return (
    <header>
      <div className="relative">
        <div className="profile-banner">
          <div className="profile-banner__placeholder" aria-hidden="true">
            <span className="profile-banner__label">BANNER IMAGE 800×172</span>
          </div>
        </div>
        <button
          type="button"
          className="iconbtn profile-share"
          aria-label="Partager le profil"
          disabled={readOnly}
        >
          <Share className="h-[17px] w-[17px]" aria-hidden="true" />
        </button>
      </div>

      <div className="px-[22px]">
        <div className="mt-4 flex items-center gap-4">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[30px] font-semibold text-accent">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate font-display text-[22px] font-semibold leading-tight text-neutral-900">
              {displayName}
            </h1>
            {role && <p className="mb-0 mt-0.5 text-[13.5px] text-neutral-500">{role}</p>}
          </div>
        </div>

        {followersCount > 0 && (
          <p className="mb-0 mt-4 text-[13.5px] text-neutral-600">
            <b className="font-display font-bold text-neutral-900">{followersDisplay}</b> abonnés
          </p>
        )}

        {bio && <p className="mb-0 mt-3 text-[13.5px] leading-normal text-neutral-600">{bio}</p>}

        <div className="mb-1 mt-5 flex items-center gap-2.5">
          <button
            type="button"
            className="btn btn--dark flex-1"
            disabled={!onAddContent}
            onClick={onAddContent}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Modifier contenu
          </button>
          <button
            type="button"
            className="btn btn--ghost flex-1"
            disabled={readOnly}
            onClick={onEditProfile}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modifier profil
          </button>
        </div>
      </div>
    </header>
  )
}
