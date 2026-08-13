'use client'

// Rail zone "home" — remplace HomeActivitySidebar.tsx (supprimé). 3 items
// fidèles à Prototype desktop.dc.html L45-49 : Accueil, Messages, Projet
// (avatar). Les signaux Achats/Rendez-vous/Réservations et le fil d'activité
// de l'ancien composant disparaissent — la maquette ne les montre pas, voir
// RAPPORT. Réutilisé aussi pour la zone 'messages' (voir ZoneSidebar.tsx) et,
// temporairement, en surcouche de la zone 'profile-web' via le chevron retour.
import { usePathname } from 'next/navigation'
import { House, MessageCircle } from 'lucide-react'
import { useAccountContext } from '../AccountContext'
import { DashboardNavLink } from '../DashboardNavLink'
import { MainRail } from '../MainRail'

interface Props {
  /** Appelé en plus de la navigation propre à "Projet" : nécessaire quand ce
   *  rail est affiché en surcouche d'une page profile-web (le lien pointe
   *  déjà vers la page courante, donc le pathname ne change pas et ne peut
   *  pas, seul, réinitialiser la surcouche côté ZoneSidebar.tsx). */
  onProjetSelect?: () => void
}

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function HomeSidebar({ onProjetSelect }: Props) {
  const pathname = usePathname() ?? ''
  const { activeProject } = useAccountContext()

  const homeActive = pathname === '/'
  const messagesActive = pathname.startsWith('/dashboard/messages')
  const projetActive =
    pathname.startsWith('/dashboard/site') || pathname.startsWith('/dashboard/talent')

  return (
    <MainRail ariaLabel="Navigation">
      <DashboardNavLink
        href="/"
        label="Accueil"
        className={`rail-btn rail-btn--cap-top${homeActive ? ' is-active' : ''}`}
      >
        <span className="rail-btn__icon" aria-hidden="true">
          <House className="h-5 w-5" />
        </span>
        <span className="rail-btn__label">Accueil</span>
      </DashboardNavLink>

      <DashboardNavLink
        href="/dashboard/messages"
        label="Messages"
        className={`rail-btn${messagesActive ? ' is-active' : ''}`}
      >
        <span className="rail-btn__icon" aria-hidden="true">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="rail-btn__label">Messages</span>
        {/* FACTICE — à câbler : compteur de messages non lus. Voir RAPPORT. */}
        <span className="rail-btn__badge">5</span>
      </DashboardNavLink>

      <DashboardNavLink
        href="/dashboard/site"
        label="Projet"
        className={`rail-btn rail-btn--cap-bottom${projetActive ? ' is-active' : ''}`}
        onClick={onProjetSelect}
      >
        <span className="rail-btn__avatar" aria-hidden="true">
          {activeProject.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeProject.avatarUrl} alt="" />
          ) : (
            <span>{initialOf(activeProject.name)}</span>
          )}
        </span>
        <span className="rail-btn__label">Projet</span>
      </DashboardNavLink>
    </MainRail>
  )
}
