'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Send, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@ibee/ui-react'
import { updatePublicationAction } from '../../new/actions'

type Publication = {
  id: string
  title: string
  content: string | null
  status: 'published' | 'scheduled'
  published_at: string | null
  scheduled_for: string | null
}

type Props = {
  userId: string
  publication: Publication
}

export function EditNewsEditor({ publication }: Props) {
  const [content, setContent] = useState(publication.content ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const isPublished = publication.status === 'published' && !!publication.published_at

  const hasChanges = content !== (publication.content ?? '')

  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  async function handleSubmit() {
    setErrors({})
    setSubmitting(true)

    const result = await updatePublicationAction({
      publicationId: publication.id,
      content: content.trim() || null,
      status: publication.status,
      scheduledFor: publication.scheduled_for,
    })

    if (!result.success) {
      setErrors({ _global: result.error })
      setSubmitting(false)
      toast.error(result.error)
      return
    }
  }

  return (
    <div className="mx-auto max-w-[660px] px-4 py-6 md:px-8 md:py-10">
      <a
        href="/dashboard/site/news"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux news
      </a>

      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Modifier la publication</h1>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">Contenu</h2>

        {/* Titre — readonly si publié */}
        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
            Titre
            {isPublished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-normal normal-case text-neutral-400" title="Le titre ne peut pas être modifié après publication">
                <Lock className="h-3 w-3" />
                Verrouillé
              </span>
            )}
          </label>
          <input
            type="text"
            value={publication.title}
            readOnly
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
            title={isPublished ? "Le titre ne peut pas être modifié après publication" : undefined}
          />
        </div>

        <div className="my-5 border-t border-neutral-100" />

        {/* Texte — éditable */}
        <div>
          <label htmlFor="edit-content" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">
            Texte
          </label>
          <Textarea
            id="edit-content"
            value={content}
            onChange={(e) => { setContent(e.target.value); setErrors({}) }}
            placeholder="Partagez votre actualité..."
            rows={8}
            maxLength={10000}
            error={!!errors.content}
            className="min-h-[180px]"
          />
          <div className="mt-1.5 flex items-center justify-end">
            <span className={`text-xs tabular-nums ${content.length > 10000 ? 'text-error font-medium' : 'text-neutral-400'}`}>
              {content.length}/10 000
            </span>
          </div>
        </div>
      </section>

      {errors._global && <p className="mt-5 text-sm text-error">{errors._global}</p>}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !hasChanges}
          className="inline-flex items-center gap-2 rounded-lg bg-cta-primary px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-primary-hover disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
        <a
          href="/dashboard/site/news"
          className="rounded-lg px-5 py-3 text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
        >
          Annuler
        </a>
      </div>
    </div>
  )
}
