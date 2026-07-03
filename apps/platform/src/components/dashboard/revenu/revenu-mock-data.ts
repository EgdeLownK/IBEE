/** Données démo — à remplacer par des requêtes scopées user vs entity. */

export type RevenuMockData = {
  weekValues: number[]
  yearValues: number[]
  balanceCents: number
  payoutLabelWeek: string
  payoutLabelYear: string
  transfers: { date: string; label: string; amount: string }[]
}

/** Revenus perso : wallet utilisateur (affiliation, tips perso, etc.) */
export const REVENU_PERSO_MOCK: RevenuMockData = {
  weekValues: [42, 0, 85, 0, 120, 65, 0],
  yearValues: [180, 220, 190, 240, 310, 280, 350, 290, 260, 400, 380, 420],
  balanceCents: 123_500,
  payoutLabelWeek: 'Encaissement automatique le 24 juin',
  payoutLabelYear: 'Prochain virement le 1er juillet',
  transfers: [
    { date: '23/06/2025', label: 'Virement SEPA — compte perso', amount: '+ 65,00 €' },
    { date: '20/06/2025', label: 'Virement SEPA — compte perso', amount: '+ 120,00 €' },
    { date: '09/06/2025', label: 'Virement SEPA — compte perso', amount: '+ 85,00 €' },
  ],
}

/** Revenus projet : CA entity (shop + RDV + billetterie), partagé équipe */
export const REVENU_PROJET_MOCK: RevenuMockData = {
  weekValues: [185, 240, 0, 320, 410, 510, 0],
  yearValues: [620, 840, 710, 920, 880, 1040, 980, 1120, 890, 760, 940, 1180],
  balanceCents: 384_000,
  payoutLabelWeek: 'Virement projet prévu le 24 juin',
  payoutLabelYear: 'Prochain virement projet le 1er juillet',
  transfers: [
    { date: '23/06/2025', label: 'Boutique + billetterie', amount: '+ 510,00 €' },
    { date: '20/06/2025', label: 'Rendez-vous + shop', amount: '+ 320,00 €' },
    { date: '16/06/2025', label: 'Virement SEPA projet', amount: '+ 425,00 €' },
  ],
}
