'use client'

import { Inbox } from 'lucide-react'

/**
 * Etat vide studio quand le profil n'a strictement aucun contenu (actualités,
 * offres d'emploi, histoire — voir hasAnyContent dans ProfileStudio.tsx).
 * Remplace la barre d'onglets ET la zone de contenu : distinct de l'état vide
 * de SharedHomeWidgetsList, qui gère le cas "contenu existant mais aucun
 * widget épinglé à l'accueil" et reste inchangé.
 *
 * Pas de bouton ici (retiré le 29/07/2026) : il faisait doublon avec « Ajouter
 * contenu » du hero (ProfileHeroEditor), qui ouvre le même overlay via
 * openAddContent dans ProfileStudio.tsx. Le texte ci-dessous renvoie donc
 * explicitement vers ce bouton comme seule action possible.
 */
export function ProfileStudioEmptyState() {
  return (
    <div className="profile-section flex justify-center">
      <div className="studio-empty-state">
        <Inbox
          className="studio-empty-state__icon h-10 w-10"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="studio-empty-state__title">Rien à afficher pour l&rsquo;instant</h2>
        <p className="studio-empty-state__text max-w-xs">
          C&rsquo;est ici qu&rsquo;apparaîtront vos publications. Commencez avec{' '}
          <strong className="studio-empty-state__highlight">Ajouter contenu</strong>.
        </p>
      </div>
    </div>
  )
}
