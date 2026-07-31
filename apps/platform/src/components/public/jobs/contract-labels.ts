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

// Nom du contrat pour la page détail (PublicJobOfferDetail.tsx) — distinct du
// libellé secondaire de la pastille carte (CONTRACT_PILL.label, ex. "Temps
// plein" pour cdi) : le candidat doit voir le TYPE de contrat proposé, pas
// seulement sa description. VOLONTAIRE : Record séparé plutôt que de
// réutiliser CONTRACT_PILL.label ici — corrigé après une première version qui
// affichait le libellé secondaire et faisait disparaître le nom du contrat
// (ex. une offre CDI affichait "Temps plein" au lieu de "CDI").
const CONTRACT_NAME: Record<JobContractType, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  interim: 'Intérim',
  contrat_pro: 'Contrat pro',
  apprentissage: 'Apprentissage',
  stage: 'Stage',
  mission: 'Freelance',
}

// Libellé pastille de la page détail. Repli sur la valeur brute si inconnue
// de CONTRACT_NAME, même motif que contractPill : jamais de crash.
export function contractLabel(value: string): string {
  return (CONTRACT_NAME as Record<string, string | undefined>)[value] ?? value
}
