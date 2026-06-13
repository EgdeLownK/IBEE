'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateEntityProfileAction } from '@/app/dashboard/site/entity-profile-actions'
import type { ProfileGeneralData } from '@/lib/profile-general-data'
import { HeroMediaEditor } from './HeroMediaEditor'

type Props = {
  data: ProfileGeneralData
}

export function GeneralSettingsForm({ data }: Props) {
  const [displayName, setDisplayName] = useState(data.entity.display_name)
  const [role, setRole] = useState(data.entity.role ?? '')
  const [bio, setBio] = useState(data.entity.bio ?? '')
  const [location, setLocation] = useState(data.entity.location ?? '')
  const [avatarUrl, setAvatarUrl] = useState(data.entity.avatar_url)
  const [bannerUrl, setBannerUrl] = useState(data.entity.banner_url)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  function err(field: string) {
    return fieldErrors[field]
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateEntityProfileAction({
        display_name: displayName,
        role,
        bio,
        location,
      })
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      setFieldErrors({})
      if (result.entity) {
        setDisplayName(result.entity.display_name)
        setRole(result.entity.role ?? '')
        setBio(result.entity.bio ?? '')
        setLocation(result.entity.location ?? '')
      }
      toast.success('Profil enregistré')
    })
  }

  return (
    <main className="profile-general-page">
      <Link href={data.studioUrl} className="profile-general-page__back">
        <ArrowLeft className="h-4 w-4" />
        Retour au studio
      </Link>

      <section className="infos-card">
        <h2 className="infos-card__title">Générale</h2>

        <HeroMediaEditor
          displayName={displayName}
          avatarUrl={avatarUrl}
          bannerUrl={bannerUrl}
          onAvatarChange={setAvatarUrl}
          onBannerChange={setBannerUrl}
        />

        <div className="infos-field">
          <label className="infos-label" htmlFor="field-url">
            Url
          </label>
          <div className="infos-input-with-suffix">
            <input
              id="field-url"
              type="text"
              value={data.profileUrlDisplay}
              className="infos-input infos-input--readonly"
              readOnly
            />
            <Check className="infos-input-suffix h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="infos-row">
          <div className="infos-field flex-1">
            <label className="infos-label" htmlFor="field-name">
              Nom
            </label>
            <input
              id="field-name"
              type="text"
              maxLength={80}
              className="infos-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            {err('display_name') ? <p className="infos-error">{err('display_name')}</p> : null}
          </div>
          <div className="infos-field flex-1">
            <label className="infos-label" htmlFor="field-role">
              Rôle
            </label>
            <input
              id="field-role"
              type="text"
              maxLength={80}
              className="infos-input"
              placeholder="Ex. Coiffeur barbier"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            {err('role') ? <p className="infos-error">{err('role')}</p> : null}
          </div>
        </div>

        <div className="infos-field">
          <label className="infos-label" htmlFor="field-location">
            Lieu
          </label>
          <input
            id="field-location"
            type="text"
            maxLength={120}
            className="infos-input"
            placeholder="Ex. Nantes, France"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          {err('location') ? <p className="infos-error">{err('location')}</p> : null}
        </div>

        <div className="infos-field">
          <label className="infos-label" htmlFor="field-bio">
            Bio
          </label>
          <textarea
            id="field-bio"
            maxLength={200}
            rows={3}
            className="infos-textarea"
            placeholder="Quelques mots sur toi…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <span className="infos-textarea-counter">{bio.length}/200</span>
          {err('bio') ? <p className="infos-error">{err('bio')}</p> : null}
        </div>

        <button type="button" className="infos-save" disabled={pending} onClick={handleSave}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{pending ? 'Enregistrement…' : 'Enregistrer'}</span>
        </button>
      </section>

      <section className="infos-card">
        <h2 className="infos-card__title">Liens</h2>
        <p className="infos-hint-muted">
          Les liens sociaux personnalisés arrivent dans une prochaine mise à jour du studio.
        </p>
      </section>
    </main>
  )
}
