'use client'

import { useAccountContext } from '@/components/dashboard/AccountContext'
import { REVENU_PERSO_MOCK } from './revenu-mock-data'
import { RevenuScreen } from './RevenuScreen'

/**
 * Revenus liés au compte utilisateur IBEE (auth user).
 * Indépendant des projets / entities — un seul wallet par personne.
 */
export function RevenuPersoDashboard() {
  const { personalAccount } = useAccountContext()

  return (
    <RevenuScreen
      title="Revenus perso"
      subtitle={`${personalAccount.displayName} — encaissements personnels, sans lien avec les projets`}
      data={REVENU_PERSO_MOCK}
    />
  )
}
