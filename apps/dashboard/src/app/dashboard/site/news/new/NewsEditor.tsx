'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@ibee/ui-react'
import { Textarea } from '@ibee/ui-react'
import { UploadPublicationImages } from '@ibee/ui-react'
import { PublicationCardPreview } from '@ibee/ui-react'
import type { ImageItem } from '@ibee/ui-react'
import { createClient } from '@/lib/supabase/client'
import { publishPublication } from './actions'

type Props = {
  userId: string
  webUrl: string
  entitySlug: string
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const ratio = current / max
  const isNear = ratio >= 0.9
  const isOver = current > max

  return (
    <div className="flex items-center gap-2">
      {/* Progress bar */}
      <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full transition-all duration-150 ${
            isOver ? 'bg-error' : isNear ? 'bg-accent' : 'bg-neutral-300'
          }`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums ${isOver ? 'text-error font-medium' : isNear ? 'text-accent' : 'text-neutral-400'}`}>
        {current}/{max.toLocaleString('fr-FR')}
      </span>
    </div>
  )
}

export function NewsEditor({ userId, webUrl, entitySlug }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'published' | 'scheduled'>('published')
  const [scheduledFor, setScheduledFor] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const hasChanges = title.trim().length > 0 || content.trim().length > 0 || images.length > 0

  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const handleImagesChange = useCallback((updater: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => {
    if (typeof updater === 'function') {
      setImages(updater)
    } else {
      setImages(updater)
    }
  }, [])

  async function handleUpload(file: File): Promise<string> {
    const supabase = createClient()
    const batchId = crypto.randomUUID()
    const path = `${userId}/${batchId}/${file.name}`

    const { error } = await supabase.storage
      .from('publication-media')
      .upload(path, file, { contentType: 'image/webp' })

    if (error) throw error

    const { data } = supabase.storage.from('publication-media').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleRemoveUploaded(url: string) {
    const supabase = createClient()
    const match = url.match(/\/publication-media\/(.+)$/)
    if (match) {
      await supabase.storage.from('publication-media').remove([match[1]])
    }
  }

  async function handleSubmit() {
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Le titre est obligatoire'
    if (title.trim().length > 120) newErrors.title = 'Le titre ne peut pas dépasser 120 caractères'
    if (!content.trim() && images.length === 0) newErrors.content = 'Ajoutez du texte ou au moins une image'
    if (status === 'scheduled' && (!scheduledFor || new Date(scheduledFor) <= new Date())) {
      newErrors.scheduledFor = 'La date doit être dans le futur'
    }

    const pendingUploads = images.some(i => i.uploading)
    if (pendingUploads) {
      newErrors.images = 'Attendez la fin des uploads'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)

    const media = images
      .filter(i => i.uploadedUrl)
      .map(i => ({ url: i.uploadedUrl!, width: i.width, height: i.height }))

    const result = await publishPublication({
      title: title.trim(),
      content: content.trim() || null,
      status,
      scheduledFor: status === 'scheduled' ? new Date(scheduledFor).toISOString() : null,
      media,
    })

    if (!result.success) {
      setErrors(result.fieldErrors ?? { _global: result.error })
      setSubmitting(false)
      toast.error(result.error)
      return
    }

    toast.success(status === 'published' ? 'Publication créée avec succès' : 'Publication programmée avec succès')
  }

  const imagePreviewUrls = images.map(i => i.previewUrl)

  return (
    <div className="flex h-full w-full">
      {/* Colonne gauche — Formulaire */}
      <div className="flex-[3] min-w-0 overflow-y-auto bg-background">
        <div className="mx-auto max-w-[660px] px-4 py-6 md:px-8 md:py-10">
          {/* Back link */}
          <a
            href={`${webUrl}/${entitySlug}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au profil
          </a>

          {/* Page header */}
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Nouvelle publication</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Partagez une actualité, une annonce ou un moment avec votre communauté.
            </p>
          </div>

          {/* Section — Contenu */}
          <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">Contenu</h2>

            {/* Titre */}
            <div>
              <label htmlFor="pub-title" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">
                Titre
              </label>
              <Input
                id="pub-title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErrors(prev => { const { title: _, ...rest } = prev; return rest }) }}
                placeholder="Titre de votre publication"
                maxLength={120}
                error={!!errors.title}
              />
              <div className="mt-1.5 flex items-center justify-between">
                {errors.title ? <p className="text-xs text-error">{errors.title}</p> : <span />}
                <CharCounter current={title.length} max={120} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
                Le titre ne peut pas être modifié après publication, pour le bien du référencement par Google et les IA.
              </p>
            </div>

            {/* Separator */}
            <div className="my-5 border-t border-neutral-100" />

            {/* Texte */}
            <div>
              <label htmlFor="pub-content" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">
                Texte
              </label>
              <Textarea
                id="pub-content"
                value={content}
                onChange={(e) => { setContent(e.target.value); setErrors(prev => { const { content: _, ...rest } = prev; return rest }) }}
                placeholder="Partagez votre actualité..."
                rows={8}
                maxLength={10000}
                error={!!errors.content}
                className="min-h-[180px]"
              />
              <div className="mt-1.5 flex items-center justify-between">
                {errors.content ? <p className="text-xs text-error">{errors.content}</p> : <span />}
                <CharCounter current={content.length} max={10000} />
              </div>
            </div>
          </section>

          {/* Section — Médias */}
          <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Médias</h2>
              {images.length > 0 && (
                <span className="text-xs text-neutral-400">{images.length}/10 images</span>
              )}
            </div>
            <UploadPublicationImages
              images={images}
              onImagesChange={handleImagesChange}
              onUpload={handleUpload}
              onRemoveUploaded={handleRemoveUploaded}
            />
            {errors.images && <p className="mt-2 text-xs text-error">{errors.images}</p>}
          </section>

          {/* Section — Programmation */}
          <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">Programmation</h2>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-600">Programmer la publication</span>
              <span className="relative inline-flex h-6 w-11 shrink-0">
                <input
                  type="checkbox"
                  checked={status === 'scheduled'}
                  onChange={(e) => setStatus(e.target.checked ? 'scheduled' : 'published')}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-neutral-200 transition-colors duration-150 peer-checked:bg-accent" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-neutral-0 shadow-sm transition-transform duration-150 peer-checked:translate-x-5" />
              </span>
            </label>

            {status === 'scheduled' && (
              <div className="mt-4">
                <label htmlFor="pub-schedule" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">
                  Date et heure
                </label>
                <Input
                  id="pub-schedule"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => { setScheduledFor(e.target.value); setErrors(prev => { const { scheduledFor: _, ...rest } = prev; return rest }) }}
                  error={!!errors.scheduledFor}
                />
                {errors.scheduledFor && <p className="mt-1.5 text-xs text-error">{errors.scheduledFor}</p>}
              </div>
            )}
          </section>

          {/* Actions */}
          {errors._global && <p className="mt-5 text-sm text-error">{errors._global}</p>}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-cta-primary px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-primary-hover disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Publication...' : status === 'published' ? 'Publier' : 'Programmer'}
            </button>
            <a
              href="/dashboard/site/news"
              className="rounded-lg px-5 py-3 text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
            >
              Annuler
            </a>
          </div>

          {/* Bottom spacing */}
          <div className="h-12" />
        </div>
      </div>

      {/* Colonne droite — Prévisualisation (desktop only) */}
      <div className="hidden lg:block flex-[2] min-w-0 overflow-y-auto border-l border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-[440px] px-8 py-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-neutral-400">Aperçu</p>
          <PublicationCardPreview
            title={title}
            content={content || null}
            imageUrls={imagePreviewUrls}
          />
        </div>
      </div>
    </div>
  )
}
