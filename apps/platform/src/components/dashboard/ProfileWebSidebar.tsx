'use client'

// Rail zone "profile-web" — remplace ProfileSidebar.tsx (supprimé). Contenu et
// ordre fidèles à Prototype desktop.dc.html L50-58 : chevron retour, sélecteur
// de compte (avatar + nom, ProjectAccountSwitcher variant="rail"), séparateur,
// Mon site, Recrutement, À venir. "Stats" (maquette L56) n'est volontairement
// pas repris — décision Killian actée dans le brief : non construit.
import { ChevronLeft, Clock, PanelsTopLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { DashboardNavLink } from './DashboardNavLink'
import { MainRail, closeAppDrawer } from './MainRail'
import { ProjectAccountSwitcher } from './ProjectAccountSwitcher'

export function ProfileWebSidebar() {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const isPreviewDashboard = searchParams?.get('preview') === 'dashboard'

  const monSiteActive =
    pathname.startsWith('/dashboard/site') ||
    pathname.startsWith('/profile-preview/') ||
    pathname.startsWith('/feed-detail/') ||
    (isPreviewDashboard &&
      (pathname.includes('/shop/') ||
        pathname.includes('/events/') ||
        pathname.includes('/services/')))
  const recrutActive = pathname.startsWith('/dashboard/talent')

  return (
    <MainRail ariaLabel="Navigation profil web">
      <Link
        href="/"
        className="rail-btn rail-btn--pill"
        title="Retour à l'accueil"
        aria-label="Retour à l'accueil"
        onClick={() => {
          if (window.innerWidth < 1200) closeAppDrawer()
        }}
      >
        <span className="rail-btn__icon" aria-hidden="true">
          <ChevronLeft className="h-5 w-5" />
        </span>
      </Link>

      <ProjectAccountSwitcher variant="rail" />

      <hr className="rail-separator" />

      <DashboardNavLink
        href="/dashboard/site"
        label="Mon site"
        className={`rail-btn${monSiteActive ? ' is-active' : ''}`}
      >
        <span className="rail-btn__icon" aria-hidden="true">
          <PanelsTopLeft className="h-5 w-5" />
        </span>
        <span className="rail-btn__label">Mon site</span>
      </DashboardNavLink>

      <DashboardNavLink
        href="/dashboard/talent"
        label="Recrutement"
        className={`rail-btn${recrutActive ? ' is-active' : ''}`}
      >
        <span className="rail-btn__icon" aria-hidden="true">
          <Users className="h-5 w-5" />
        </span>
        <span className="rail-btn__label">Recrut.</span>
        {/* FACTICE — à câbler : nombre de nouvelles candidatures. Aucune donnée
            agrégée n'existe aujourd'hui, voir RAPPORT. */}
        <span className="rail-btn__badge">7</span>
      </DashboardNavLink>

      <span className="rail-btn is-disabled rail-btn--cap-bottom" aria-disabled="true">
        <span className="rail-btn__icon" aria-hidden="true">
          <Clock className="h-5 w-5" />
        </span>
        <span className="rail-btn__label">À venir</span>
      </span>
    </MainRail>
  )
}
