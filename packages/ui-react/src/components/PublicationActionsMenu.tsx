'use client'

import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

type Props = {
  publicationId: string
  editUrl: string
  onDelete: (publicationId: string) => Promise<void>
}

export function PublicationActionsMenu({ publicationId, editUrl, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(publicationId)
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
      setMenuOpen(false)
    }
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen(!menuOpen)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Actions de la publication"
      >
        <Ellipsis className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-neutral-200 bg-neutral-0 py-1 shadow-lg">
            <a
              href={editUrl}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmOpen(true)
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false)
          }}
        >
          <div className="fixed inset-0 bg-neutral-900/40" />
          <div className="relative w-[90vw] max-w-md rounded-xl bg-neutral-0 p-6 shadow-lg">
            <h3 className="text-base font-semibold text-neutral-900">
              Supprimer cette publication ?
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Cette action est irréversible. La publication et ses commentaires seront
              définitivement supprimés.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
