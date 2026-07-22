'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CreateEntityDialog({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleNameChange(value: string) {
    setName(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true)
    setSlug(slugify(value))
  }

  function handleClose() {
    setName('')
    setSlug('')
    setSlugManuallyEdited(false)
    setError('')
    onClose()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fermer"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Créer une entreprise</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-neutral-100"
          >
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            startTransition(() => {
              setError("La création d'entreprise sera disponible prochainement.")
            })
          }}
        >
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="Nom de l'entreprise"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Slug URL *</label>
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900/20">
              <span className="px-3 text-xs text-neutral-400 bg-neutral-50 border-r border-neutral-200 py-2.5 shrink-0">
                ibee.io/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                placeholder="mon-entreprise"
                required
              />
            </div>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isPending || !name.trim() || !slug}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Création...' : 'Créer mon entreprise IBEE'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
