import type { JobContractType } from '@ibee/supabase'

// Source unique des libellés de pastille contrat, partagée par JobOfferRow
// (carte) et PublicJobOfferDetail (page détail) — un seul Record à modifier
// pour changer les deux surfaces, et le typage sur JobContractType (l'enum
// réel généré depuis Supabase, pas une union recopiée à la main) fait échouer
// le build si une valeur d'enum future n'a pas son entrée ici.
//
// VOLONTAIRE : le libellé secondaire n'a pas de colonne dédiée en base (seul
// contract_type existe) — texte de présentation, pas une donnée vérifiée.
export const CONTRACT_PILL: Record<JobContractType, { code: string; label: string }> = {
  cdi: { code: 'CDI', label: 'Temps plein' },
  cdd: { code: 'CDD', label: 'Durée déterminée' },
  interim: { code: 'INT', label: 'Mission courte' },
  contrat_pro: { code: 'PRO', label: 'Alternance' },
  apprentissage: { code: 'APP', label: 'Alternance' },
  stage: { code: 'STA', label: 'Stage' },
  mission: { code: 'FREE', label: 'Freelance' },
}

const FALLBACK_PILL = { code: '—', label: '' }

// Accepte `string` (pas JobContractType) volontairement : les données qui
// transitent par le client (props JSON, valeurs Supabase brutes côté
// affichage) ne sont pas garanties par le compilateur au runtime — une
// valeur d'enum future non encore ajoutée à CONTRACT_PILL ne doit jamais
// planter le rendu, juste s'afficher en dégradé.
export function contractPill(value: string): { code: string; label: string } {
  return (
    (CONTRACT_PILL as Record<string, { code: string; label: string } | undefined>)[value] ?? {
      ...FALLBACK_PILL,
      code: value.toUpperCase(),
    }
  )
}

// Libellé pastille de la page détail : même contenu que le libellé
// secondaire de la carte (décision produit, mission
// feat/job-offer-contract-types-ui) — un seul Record en amont (CONTRACT_PILL)
// pour ne pas les faire diverger.
export function contractLabel(value: string): string {
  return contractPill(value).label || value
}
