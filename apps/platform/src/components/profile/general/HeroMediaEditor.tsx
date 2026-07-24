'use client'

import { useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AvatarCropperModal } from '@ibee/ui-react'
import {
  deleteEntityAvatarAction,
  deleteEntityBannerAction,
  uploadEntityAvatarAction,
  uploadEntityBannerAction,
} from '@/app/dashboard/site/entity-profile-actions'
import { BannerImageCropDialog } from '../history/BannerImageCropDialog'

type Props = {
  displayName: string
  avatarUrl: string | null
  bannerUrl: string | null
  layout?: 'general' | 'compact'
  onAvatarChange?: (url: string | null) => void
  onBannerChange?: (url: string | null) => void
}

export function HeroMediaEditor({
  displayName,
  avatarUrl,
  bannerUrl,
  layout = 'general',
  onAvatarChange,
  onBannerChange,
}: Props) {
  const [avatar, setAvatar] = useState(avatarUrl)
  const [banner, setBanner] = useState(bannerUrl)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null)
  const [bannerCropOpen, setBannerCropOpen] = useState(false)
  const [pending, setPending] = useState<'avatar' | 'banner' | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  const wrapClass = layout === 'general' ? 'infos-banner-wrap' : 'hero-edit-wrap'

  function pickAvatar() {
    avatarInputRef.current?.click()
  }

  function pickBanner() {
    bannerInputRef.current?.click()
  }

  function onAvatarFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choisis une image.')
      return
    }
    setAvatarCropSrc(URL.createObjectURL(file))
  }

  function onBannerFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choisis une image.')
      return
    }
    setBannerCropSrc(URL.createObjectURL(file))
    setBannerCropOpen(true)
  }

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
    setAvatar(result.url)
    onAvatarChange?.(result.url)
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
    setBanner(result.url)
    onBannerChange?.(result.url)
    toast.success('Bannière mise à jour')
  }

  async function removeAvatar() {
    if (!confirm('Supprimer la photo de profil ?')) return
    setPending('avatar')
    const result = await deleteEntityAvatarAction()
    setPending(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setAvatar(null)
    onAvatarChange?.(null)
    toast.success('Photo supprimée')
  }

  async function removeBanner() {
    if (!confirm('Supprimer la bannière ?')) return
    setPending('banner')
    const result = await deleteEntityBannerAction()
    setPending(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setBanner(null)
    onBannerChange?.(null)
    toast.success('Bannière supprimée')
  }

  return (
    <>
      <div className={wrapClass}>
        <div className="infos-banner infos-banner--editable">
          <button
            type="button"
            className="infos-banner__btn"
            aria-label="Modifier la bannière"
            onClick={pickBanner}
            disabled={pending === 'banner'}
          >
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner} alt="" className="infos-banner__img" />
            ) : (
              <div className="infos-banner__placeholder" aria-hidden="true" />
            )}
            <span className="banner-edit-hint is-visible" aria-hidden="true">
              {pending === 'banner' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Modifier
            </span>
          </button>
          {banner ? (
            <button
              type="button"
              className="infos-media-delete"
              aria-label="Supprimer la bannière"
              onClick={() => void removeBanner()}
              disabled={pending === 'banner'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="infos-avatar infos-avatar--editable">
          <button
            type="button"
            className="infos-avatar__btn"
            aria-label="Modifier la photo de profil"
            onClick={pickAvatar}
            disabled={pending === 'avatar'}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="font-display text-3xl font-medium text-neutral-500">{initials}</span>
            )}
            <span className="avatar-edit-hint is-visible" aria-hidden="true">
              {pending === 'avatar' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </span>
          </button>
          {avatar ? (
            <button
              type="button"
              className="infos-media-delete infos-media-delete--avatar"
              aria-label="Supprimer la photo"
              onClick={() => void removeAvatar()}
              disabled={pending === 'avatar'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          onAvatarFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          onBannerFile(e.target.files?.[0])
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
    </>
  )
}
