'use client'

import { AlertTriangle } from 'lucide-react'

type UnsavedChangesModalProps = {
  isOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedChangesModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-neutral-0 p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-900">
              Modifications non sauvegardées
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Vous avez des modifications non sauvegardées.
              Que souhaitez-vous faire ?
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-medium text-error transition hover:bg-error/5"
          >
            Ignorer les modifications
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-cta-primary px-4 py-2 text-sm font-medium text-neutral-0 transition duration-200 hover:bg-cta-primary-hover"
          >
            Sauvegarder et continuer
          </button>
        </div>
      </div>
    </div>
  )
}
