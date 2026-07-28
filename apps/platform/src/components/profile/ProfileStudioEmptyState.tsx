'use client'

import { Plus } from 'lucide-react'

type Props = {
  onAddContent: () => void
}

/**
 * Etat vide studio quand le profil n'a strictement aucun contenu (actualités,
 * offres d'emploi, histoire — voir hasAnyContent dans ProfileStudio.tsx).
 * Remplace la barre d'onglets ET la zone de contenu : distinct de l'état vide
 * de SharedHomeWidgetsList, qui gère le cas "contenu existant mais aucun
 * widget épinglé à l'accueil" et reste inchangé.
 */
export function ProfileStudioEmptyState({ onAddContent }: Props) {
  return (
    <div className="profile-section flex flex-col items-center gap-2 py-16 text-center">
      <h2 className="m-0 font-display text-lg font-semibold text-neutral-900">
        Votre page est prête
      </h2>
      <p className="m-0 max-w-sm text-sm text-neutral-500">
        Ajoutez votre premier contenu — il apparaîtra ici, à la vue de vos visiteurs.
      </p>
      <button type="button" className="btn btn--dark mt-3" onClick={onAddContent}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Ajouter contenu
      </button>
    </div>
  )
}
