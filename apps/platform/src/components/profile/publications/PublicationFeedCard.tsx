'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Link2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { PublicationMediaCarousel } from '@ibee/ui-react'
import {
  deletePublicationAction,
  updatePublicationContentAction,
} from '@/app/dashboard/site/publication-actions'
import { PublicationEngageBar } from '@/components/public/PublicationEngageBar'
import { PublicationCardText } from '@/components/public/PublicationCardText'

type PublicationMedia = {
  id?: string
  url: string
  type?: string | null
  position?: number
  width?: number | null
  height?: number | null
}

export type FeedPublication = {
  id: string
  entity_id: string
  title: string
  slug: string
  content: string | null
  created_at: string
  published_at: string | null
  status?: string | null
  comments_count?: number
  publication_media?: PublicationMedia[]
}

function isPublicPublication(pub: FeedPublication): boolean {
  return (
    Boolean(pub.slug) &&
    pub.status === 'published' &&
    Boolean(pub.published_at) &&
    new Date(pub.published_at!) <= new Date()
  )
}

type Props = {
  publication: FeedPublication
  entitySlug: string
  entityDisplayName: string
  entityAvatarUrl: string | null
  webBaseUrl: string
  onUpdated: (pub: FeedPublication) => void
  onDeleted: (id: string) => void
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function PublicationFeedCard({
  publication,
  entitySlug,
  entityDisplayName,
  entityAvatarUrl,
  onUpdated,
  onDeleted,
}: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState(publication.content ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const initial = entityDisplayName.charAt(0).toUpperCase()
  const dateSource = publication.published_at ?? publication.created_at
  const media = [...(publication.publication_media ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )
  const permalink = isPublicPublication(publication)
    ? `/${entitySlug}/news/${publication.slug}`
    : null

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    if (!permalink) return
    const target = e.target as HTMLElement
    if (target.closest('a, button, textarea, input, [role="menu"]')) return
    router.push(permalink)
  }

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  async function handleDelete() {
    if (!confirm('Supprimer cette publication ?')) return
    setMenuOpen(false)
    setBusy(true)
    setError(null)
    const prev = publication
    onDeleted(publication.id)
    const res = await deletePublicationAction(publication.id)
    setBusy(false)
    if (!res.ok) {
      onUpdated(prev)
      setError(res.error)
    }
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    const res = await updatePublicationContentAction(publication.id, draft)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setEditOpen(false)
    onUpdated({
      ...publication,
      title: res.publication.title,
      content: res.publication.content,
    })
  }

  return (
    <>
      <article
        className={`pub-card pub-card--feed${permalink ? ' pub-card--clickable' : ''}`}
        onClick={permalink ? handleCardClick : undefined}
      >
        <div className="pub-card__head">
          <div className="pub-card__avatar">
            {entityAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entityAvatarUrl} alt="" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="pub-card__meta-block min-w-0 flex-1">
            <h3 className="pub-card__title m-0 truncate">
              {permalink ? (
                <Link href={permalink}>{publication.title}</Link>
              ) : (
                <span>{publication.title || 'Publication'}</span>
              )}
            </h3>
            <time className="pub-card__meta">{formatDate(dateSource)}</time>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="pub-card__menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Options de la publication"
              disabled={busy}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="widget-menu" role="menu">
                <button
                  type="button"
                  className="widget-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setDraft(publication.content ?? '')
                    setEditOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span>Modifier</span>
                </button>
                <button type="button" className="widget-menu__item" role="menuitem" disabled>
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  <span>Associer</span>
                  <span className="widget-menu__soon">Bientôt</span>
                </button>
                <button
                  type="button"
                  className="widget-menu__item widget-menu__item--danger"
                  role="menuitem"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {media.length > 0 && (
          <div className="pub-card__carousel">
            <PublicationMediaCarousel
              fullWidth
              media={media.map((m) => ({
                url: m.url,
                type: m.type,
                alt_text: null,
                width: m.width,
                height: m.height,
              }))}
            />
          </div>
        )}

        {publication.content?.trim() ? (
          <PublicationCardText content={publication.content} />
        ) : (
          <p className="pub-card__text">Publication sans texte</p>
        )}
        {error && <p className="pub-card__error m-0">{error}</p>}

        <PublicationEngageBar
          entityId={publication.entity_id}
          publicationId={publication.id}
          commentsCount={publication.comments_count ?? 0}
          shareUrl={permalink ?? ''}
          commentsHref={permalink ? `${permalink}#comments` : null}
          className="pub-detail__engage--feed"
        />
      </article>

      {editOpen &&
        createPortal(
          <div className="pub-edit-overlay" role="presentation">
            <button
              type="button"
              className="pub-edit-overlay__backdrop"
              aria-label="Fermer"
              onClick={() => {
                setEditOpen(false)
                setError(null)
              }}
            />
            <div
              className="pub-edit-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pub-edit-title"
            >
              <h2 id="pub-edit-title">Modifier la publication</h2>
              <textarea
                className="pub-edit__textarea"
                rows={8}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={10000}
              />
              {error && <p className="pub-card__error m-0">{error}</p>}
              <div className="pub-edit-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy}
                  onClick={() => {
                    setEditOpen(false)
                    setError(null)
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn--dark"
                  disabled={busy}
                  onClick={handleSave}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
