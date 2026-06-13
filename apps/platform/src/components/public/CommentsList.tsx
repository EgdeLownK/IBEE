'use client'

import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CommentCard } from './CommentCard'
import type { PublicPublicationData } from '@/lib/load-public-publication'

type Comment = PublicPublicationData['comments'][number]

interface Props {
  comments: Comment[]
  commentsCount: number
  publicationId: string
  entitySlug: string
  publicationSlug: string
  isAuthenticated: boolean
  userId: string | null
  publicationOwnerUserId: string | null
  loginUrl?: string
}

export function CommentsList({
  comments,
  commentsCount,
  publicationId,
  entitySlug,
  publicationSlug,
  isAuthenticated,
  userId,
  publicationOwnerUserId,
  loginUrl = '/login',
}: Props) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicationId,
          content: trimmed,
          entitySlug,
          publicationSlug,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        router.refresh()
        setContent('')
      } else {
        setError(data.error || 'Une erreur est survenue.')
        setSubmitting(false)
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm('Supprimer ce commentaire ?')) return

    const res = await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, entitySlug, publicationSlug }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <section id="comments" className="mt-6 border-t border-neutral-200 pt-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
        <MessageCircle className="h-5 w-5 text-neutral-500" aria-hidden="true" />
        Commentaires ({commentsCount})
      </h2>

      {isAuthenticated ? (
        <form className="mt-4" onSubmit={handleSubmit}>
          <textarea
            name="content"
            rows={3}
            maxLength={2000}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-neutral-400">{content.length > 0 ? `${content.length}/2000` : ''}</span>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-cta-primary px-4 py-2 text-sm font-medium text-neutral-0 transition duration-200 hover:bg-cta-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Commenter
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-5 text-center">
          <p className="text-sm text-neutral-500">Connectez-vous pour participer à la discussion.</p>
          <Link
            href={loginUrl}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-cta-primary px-5 py-2 text-sm font-medium text-neutral-0 transition duration-200 hover:bg-cta-primary-hover"
          >
            Se connecter
          </Link>
        </div>
      )}

      {comments.length > 0 ? (
        <div className="mt-4 divide-y divide-neutral-100">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              id={comment.id}
              content={comment.content}
              createdAt={comment.created_at}
              authorDisplayName={comment.author_display_name}
              authorAvatarUrl={comment.author_avatar_url}
              authorSlug={comment.author_slug}
              canDelete={
                userId !== null &&
                (userId === comment.user_id || userId === publicationOwnerUserId)
              }
              entitySlug={entitySlug}
              publicationSlug={publicationSlug}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 py-4 text-center text-sm text-neutral-400">Soyez le premier à commenter.</p>
      )}
    </section>
  )
}
