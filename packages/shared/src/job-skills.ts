// Aptitudes partagees entre offres d'emploi et profils candidats (job_skills,
// supabase/migrations/20260812130000_job_skills.sql). Ce fichier ne contient
// aucun appel Supabase (frontiere packages/shared, voir .claude/rules/shared.md)
// -- les fonctions qui interrogent job_skills vivent dans
// packages/supabase/src/project-talent.ts et importent normalizeJobSkillLabel
// depuis apps/platform (packages/supabase ne peut pas dependre de
// packages/shared, aucune entree `dependencies` de ce type dans son
// package.json).

// Plafond d'aptitudes par offre (Lot 4 Mission 2, valide par Killian) --
// verifie cote serveur (apps/platform/src/app/dashboard/talent/talent-actions.ts),
// pas seulement cote client (meme motif que MAX_JOB_OFFER_MEDIA,
// JobOfferDialog.tsx).
export const MAX_JOB_OFFER_SKILLS = 8

export const JOB_SKILL_LABEL_MIN_LENGTH = 2
export const JOB_SKILL_LABEL_MAX_LENGTH = 60

/**
 * MIROIR MANUEL de normalize_job_skill_label() (SQL) --
 * supabase/migrations/20260812130000_job_skills.sql. Memes regles : accents
 * retires, minuscules, espaces multiples reduits a un seul, bords coupes.
 *
 * Necessaire cote application car PostgREST ne transforme jamais une valeur
 * envoyee par le client -- toute recherche par sous-chaine sur
 * normalized_label, ou re-selection apres un ON CONFLICT (normalized_label)
 * DO NOTHING, doit normaliser ICI avant d'interroger la base.
 *
 * VOLONTAIRE (duplication signalee, pas un oubli) : si l'algorithme SQL
 * change un jour, cette fonction doit etre mise a jour a l'identique, sinon
 * la recherche/creation cote app diverge silencieusement de la contrainte
 * UNIQUE reellement appliquee en base. Le fichier SQL cite ce fichier en
 * retour (meme commentaire croisé).
 */
export function normalizeJobSkillLabel(input: string): string {
  // \p{Diacritic} (propriete Unicode, flag u) plutot qu'une plage de points
  // de code ecrite en dur : plus lisible et evite tout caractere combinant
  // litteral dans le code source.
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Miroir du CHECK (char_length(btrim(label)) BETWEEN 2 AND 60) de
 * job_skills. Retourne un message d'erreur en francais, ou null si valide.
 * Appelee cote client (retour immediat) ET cote serveur (talent-actions.ts,
 * source de verite -- un appel direct a l'action ne peut pas contourner ce
 * controle).
 */
export function validateJobSkillLabel(label: string): string | null {
  const length = label.trim().length
  if (length < JOB_SKILL_LABEL_MIN_LENGTH || length > JOB_SKILL_LABEL_MAX_LENGTH) {
    return `Le libellé doit contenir entre ${JOB_SKILL_LABEL_MIN_LENGTH} et ${JOB_SKILL_LABEL_MAX_LENGTH} caractères.`
  }
  return null
}
