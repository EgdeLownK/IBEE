'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import { DetailEntityStrip } from '@/components/public/detail/DetailEntityStrip'

type Props = {
  entity: {
    slug: string
    display_name: string
    avatar_url: string | null
  }
  senderName: string
  senderEmail: string
}

export function MessagePage({ entity, senderName, senderEmail }: Props) {
  const [name, setName] = useState(senderName)
  const [email, setEmail] = useState(senderEmail)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedBody = body.trim()

    if (!trimmedName || !trimmedEmail || !trimmedBody) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/entity-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_slug: entity.slug,
          sender_name: trimmedName,
          sender_email: trimmedEmail,
          body: trimmedBody,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Envoi impossible')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="profile-page">
      <ProfileShell>
        <DetailTopBar backHref={`/${entity.slug}`} title="Envoyer un message" />

        <DetailEntityStrip
          displayName={entity.display_name}
          avatarUrl={entity.avatar_url}
          profileHref={`/${entity.slug}`}
          title={entity.display_name}
        />

        <section className="message-page px-[22px] pt-[18px] pb-6">
          {!success ? (
            <>
              <p className="message-page__intro">
                Votre message sera envoyé directement au compte IBEE de{' '}
                <strong>{entity.display_name}</strong>.
              </p>

              <form className="message-form" onSubmit={handleSubmit} noValidate>
                <label className="message-form__field">
                  <span>Votre nom</span>
                  <input
                    type="text"
                    name="sender_name"
                    className="message-form__input"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label className="message-form__field">
                  <span>Votre email</span>
                  <input
                    type="email"
                    name="sender_email"
                    className="message-form__input"
                    required
                    maxLength={320}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label className="message-form__field">
                  <span>Message</span>
                  <textarea
                    name="body"
                    className="message-form__textarea"
                    rows={6}
                    required
                    maxLength={2000}
                    placeholder="Écrivez votre message…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                {error && <p className="message-form__error">{error}</p>}
                <button type="submit" className="message-form__submit" disabled={busy}>
                  Envoyer
                </button>
              </form>
            </>
          ) : (
            <div className="message-success">
              <span className="message-success__icon">
                <Check className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="message-success__title">Message envoyé</p>
              <p className="message-success__text">
                Votre message a bien été transmis au compte projet.
              </p>
              <Link href={`/${entity.slug}`} className="message-success__back">
                Retour au profil
              </Link>
            </div>
          )}
        </section>
      </ProfileShell>
    </main>
  )
}
