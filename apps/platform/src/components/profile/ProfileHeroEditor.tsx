'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Image as ImageIcon, Loader2, Pencil, Plus, Share } from 'lucide-react'
import { toast } from 'sonner'
import { AvatarCropperModal } from '@ibee/ui-react'
import {
  uploadEntityAvatarAction,
  uploadEntityBannerAction,
} from '@/app/dashboard/site/entity-profile-actions'
import { BannerImageCropDialog } from './history/BannerImageCropDialog'

export type ProfileHeroEntity = {
  display_name: string
  role: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  followers_count: number
}

type Props = {
  entity: ProfileHeroEntity
  onAddContent?: () => void
  onEntityChange?: (patch: Partial<ProfileHeroEntity>) => void
}

export function ProfileHeroEditor({ entity, onAddContent, onEntityChange }: Props) {
  const router = useRouter()
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null)
  const [bannerCropOpen, setBannerCropOpen] = useState(false)
  const [pending, setPending] = useState<'avatar' | 'banner' | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const initials = entity.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  const followersDisplay = new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(entity.followers_count)

  async function commitAvatar(blob: Blob) {
    if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc)
    setAvatarCropSrc(null)
    setPending('avatar')
    const fd = new FormData()
    fd.append('file', blob, 'avatar.webp')
    const result = await uploadEntityAvatarAction(fd)
    setPending(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    onEntityChange?.({ avatar_url: result.url })
    toast.success('Photo mise à jour')
  }

  async function commitBanner(blob: Blob) {
    setBannerCropOpen(false)
    if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc)
    setBannerCropSrc(null)
    setPending('banner')
    const fd = new FormData()
    fd.append('file', blob, 'banner.webp')
    const result = await uploadEntityBannerAction(fd)
    setPending(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    onEntityChange?.({ banner_url: result.url })
    toast.success('Bannière mise à jour')
  }

  return (
    <header>
      <div className="relative">
        <button
          type="button"
          className={`profile-banner profile-banner--editable${entity.banner_url ? ' profile-banner--has-image' : ''}`}
          aria-label="Modifier la bannière"
          disabled={pending === 'banner'}
          onClick={() => bannerInputRef.current?.click()}
        >
          {entity.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entity.banner_url} alt="" className="profile-banner__img" />
          ) : (
            <div className="profile-banner__placeholder" aria-hidden="true">
              <span className="profile-banner__label">BANNER IMAGE 800×172</span>
            </div>
          )}
          <span
            className={`banner-edit-hint${pending === 'banner' ? ' is-visible' : ''}`}
            aria-hidden="true"
          >
            {pending === 'banner' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            Modifier
          </span>
        </button>
        <button type="button" className="iconbtn profile-share" aria-label="Partager le profil" disabled>
          <Share className="h-[17px] w-[17px]" aria-hidden="true" />
        </button>
      </div>

      <div className="px-[22px]">
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            className="profile-avatar profile-avatar--editable"
            aria-label="Modifier la photo de profil"
            disabled={pending === 'avatar'}
            onClick={() => avatarInputRef.current?.click()}
          >
            {entity.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entity.avatar_url} alt={entity.display_name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[30px] font-semibold text-accent">{initials}</span>
            )}
            <span
              className={`avatar-edit-hint${pending === 'avatar' ? ' is-visible' : ''}`}
              aria-hidden="true"
            >
              {pending === 'avatar' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate font-display text-[22px] font-semibold leading-tight text-neutral-900">
              {entity.display_name}
            </h1>
            {entity.role && <p className="mb-0 mt-0.5 text-[13.5px] text-neutral-500">{entity.role}</p>}
          </div>
        </div>

        {entity.followers_count > 0 && (
          <p className="mb-0 mt-4 text-[13.5px] text-neutral-600">
            <b className="font-display font-bold text-neutral-900">{followersDisplay}</b> abonnés
          </p>
        )}

        {entity.bio && <p className="mb-0 mt-3 text-[13.5px] leading-normal text-neutral-600">{entity.bio}</p>}

        <div className="mb-1 mt-5 flex items-center gap-2.5">
          <button type="button" className="btn btn--dark flex-1 text-center justify-center" disabled={!onAddContent} onClick={onAddContent}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter contenu
          </button>
          <button
            type="button"
            className="btn btn--ghost flex-1 text-center justify-center"
            onClick={() => router.push('/dashboard/site/general')}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modifier profil
          </button>
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setAvatarCropSrc(URL.createObjectURL(f))
          e.target.value = ''
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            setBannerCropSrc(URL.createObjectURL(f))
            setBannerCropOpen(true)
          }
          e.target.value = ''
        }}
      />

      {avatarCropSrc ? (
        <AvatarCropperModal
          imageSrc={avatarCropSrc}
          onConfirm={(blob) => void commitAvatar(blob)}
          onCancel={() => {
            URL.revokeObjectURL(avatarCropSrc)
            setAvatarCropSrc(null)
          }}
        />
      ) : null}

      <BannerImageCropDialog
        open={bannerCropOpen}
        imageUrl={bannerCropSrc}
        mode="landscape"
        onComplete={(result) => void commitBanner(result.blob)}
        onCancel={() => {
          setBannerCropOpen(false)
          if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc)
          setBannerCropSrc(null)
        }}
      />
    </header>
  )
}
