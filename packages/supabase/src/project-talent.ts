import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

type Client = SupabaseClient<Database>

export type JobOfferStatus = Database['public']['Enums']['entity_job_status_v2']
export type JobContractType = Database['public']['Enums']['entity_job_contract_type']
export type JobLocationType = Database['public']['Enums']['entity_job_location_type']
export type JobCompType = Database['public']['Enums']['entity_job_comp_type']
export type JobCompFreq = Database['public']['Enums']['entity_job_comp_freq']

export type JobOffer = Database['public']['Tables']['entity_job_offers']['Row']
export type JobSector = Database['public']['Tables']['job_sectors']['Row']
// Non trie par display_order cote requete (pas de precedent d'ordre sur
// relation embarquee dans ce package, voir listProductsByEntity) : trier
// cote appelant, meme convention que product_media (ProductDetail.tsx).
// job_sectors : relation many-to-one (sector_id nullable) -> objet unique ou
// null, jamais un tableau. Colonnes limitees a id/label (pas le Row complet)
// pour matcher exactement le .select() ci-dessous.
export type JobOfferWithMedia = JobOffer & {
  entity_job_offer_media: JobOfferMedia[]
  job_sectors: Pick<JobSector, 'id' | 'label'> | null
}

export type JobApplicationStatus = Database['public']['Enums']['entity_job_application_status']
export type JobApplication = Database['public']['Tables']['entity_job_applications']['Row']

export type JobOfferMediaType = Database['public']['Enums']['entity_job_offer_media_type']
export type JobOfferMedia = Database['public']['Tables']['entity_job_offer_media']['Row']
type JobOfferMediaInsert = Database['public']['Tables']['entity_job_offer_media']['Insert']

// job_skills : referentiel partage offre/profil (supabase/migrations/
// 20260812130000_job_skills.sql). Colonnes limitees a id/label pour
// l'embed, meme convention que job_sectors(id, label) plus haut -- une
// seule FK entity_job_offer_skills -> job_skills (skill_id), pas
// d'ambiguite de relation a lever ici.
export type JobSkill = Database['public']['Tables']['job_skills']['Row']
export type JobOfferSkillRow = Database['public']['Tables']['entity_job_offer_skills']['Row']
export type JobOfferSkillWithSkill = JobOfferSkillRow & {
  job_skills: Pick<JobSkill, 'id' | 'label'>
}

// Variante de JobOfferWithMedia (pas une extension de ce type partage lui-meme,
// pour ne pas alourdir listActiveJobOffersByEntity/listOtherActiveJobOffersByEntity/
// listSimilarActiveJobOffersBySector d'un join dont elles n'ont pas besoin) --
// utilisee uniquement par getProjectJobOffer (fiche complete d'une offre).
export type JobOfferWithSkills = JobOfferWithMedia & {
  entity_job_offer_skills: JobOfferSkillWithSkill[]
}

export async function listProjectJobOffers(
  client: Client,
  entityId: string
): Promise<JobOfferWithMedia[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*, entity_job_offer_media(*), job_sectors(id, label)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Etendue Lot 4 Mission 2 (feat/job-skills-form) avec le join
// entity_job_offer_skills(job_skills) -- fiche complete d'une offre (page
// detail publique + Pilotage), meme motif que le join media/secteur deja en
// place : aucune requete par carte, tout arrive dans le meme select.
export async function getProjectJobOffer(
  client: Client,
  entityId: string,
  offerId: string
): Promise<JobOfferWithSkills> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select(
      '*, entity_job_offer_media(*), job_sectors(id, label), entity_job_offer_skills(offer_id, skill_id, display_order, created_at, job_skills(id, label))'
    )
    .eq('id', offerId)
    .eq('entity_id', entityId)
    .single()

  if (error) throw error
  return data as unknown as JobOfferWithSkills
}

export async function createProjectJobOffer(
  client: Client,
  entityId: string,
  input: Omit<Database['public']['Tables']['entity_job_offers']['Insert'], 'entity_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<JobOffer> {
  const { data, error } = await client
    .from('entity_job_offers')
    .insert({
      ...input,
      entity_id: entityId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProjectJobOffer(
  client: Client,
  entityId: string,
  offerId: string,
  input: Omit<Database['public']['Tables']['entity_job_offers']['Update'], 'entity_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<JobOffer> {
  const { data, error } = await client
    .from('entity_job_offers')
    .update(input)
    .eq('id', offerId)
    .eq('entity_id', entityId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProjectJobOffer(
  client: Client,
  entityId: string,
  offerId: string
): Promise<void> {
  const { error } = await client
    .from('entity_job_offers')
    .delete()
    .eq('id', offerId)
    .eq('entity_id', entityId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Gestion médias owner (galerie vitrine, entity_job_offer_media) — memes
// choix que addProductMedia (packages/supabase/src/products.ts) : insert en
// masse, display_order par index si non fourni.
// ---------------------------------------------------------------------------

export async function listJobOfferMedia(
  client: Client,
  offerId: string
): Promise<JobOfferMedia[]> {
  const { data, error } = await client
    .from('entity_job_offer_media')
    .select('*')
    .eq('offer_id', offerId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data
}

export async function addJobOfferMedia(
  client: Client,
  offerId: string,
  media: Omit<JobOfferMediaInsert, 'offer_id'>[]
): Promise<JobOfferMedia[]> {
  const inserts: JobOfferMediaInsert[] = media.map((m, i) => ({
    ...m,
    offer_id: offerId,
    display_order: m.display_order ?? i,
  }))

  const { data, error } = await client
    .from('entity_job_offer_media')
    .insert(inserts)
    .select()

  if (error) throw error
  return data ?? []
}

// Remplacement integral (delete puis insert) - meme simplicite que le
// remplacement de `blocks` sur entity_job_offers (colonne ecrasee en bloc a
// chaque update), pas de diff granulaire ligne a ligne.
export async function replaceJobOfferMedia(
  client: Client,
  offerId: string,
  media: Omit<JobOfferMediaInsert, 'offer_id'>[]
): Promise<JobOfferMedia[]> {
  const { error: deleteError } = await client
    .from('entity_job_offer_media')
    .delete()
    .eq('offer_id', offerId)

  if (deleteError) throw deleteError
  if (media.length === 0) return []

  return addJobOfferMedia(client, offerId, media)
}

// ---------------------------------------------------------------------------
// Aptitudes d'une offre (entity_job_offer_skills) -- meme structure list/add/
// replace que la galerie media ci-dessus, ordre porte par display_order.
// ---------------------------------------------------------------------------

export async function listJobOfferSkills(
  client: Client,
  offerId: string
): Promise<JobOfferSkillWithSkill[]> {
  const { data, error } = await client
    .from('entity_job_offer_skills')
    .select('offer_id, skill_id, display_order, created_at, job_skills(id, label)')
    .eq('offer_id', offerId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data as unknown as JobOfferSkillWithSkill[]
}

export async function addJobOfferSkills(
  client: Client,
  offerId: string,
  skillIds: string[]
): Promise<void> {
  if (skillIds.length === 0) return
  const inserts = skillIds.map((skillId, i) => ({
    offer_id: offerId,
    skill_id: skillId,
    display_order: i,
  }))

  const { error } = await client.from('entity_job_offer_skills').insert(inserts)
  if (error) throw error
}

// Remplacement integral (delete puis insert) -- meme motif que
// replaceJobOfferMedia ci-dessus.
export async function replaceJobOfferSkills(
  client: Client,
  offerId: string,
  skillIds: string[]
): Promise<void> {
  const { error: deleteError } = await client
    .from('entity_job_offer_skills')
    .delete()
    .eq('offer_id', offerId)

  if (deleteError) throw deleteError
  if (skillIds.length === 0) return

  await addJobOfferSkills(client, offerId, skillIds)
}

// ---------------------------------------------------------------------------
// Referentiel partage job_skills (recherche + find-or-create). Les deux
// fonctions recoivent une valeur DEJA NORMALISEE par l'appelant
// (normalizeJobSkillLabel, @ibee/shared) : ce package ne peut pas dependre de
// @ibee/shared (aucune entree `dependencies` de ce type dans
// packages/supabase/package.json, voir .claude/rules/shared.md) -- la
// normalisation se fait donc en amont, cote apps/platform (talent-actions.ts).
// ---------------------------------------------------------------------------

// Recherche par sous-chaine sur normalized_label -- alimente l'autocompletion
// du formulaire offre. Recherche par SOUS-CHAINE uniquement (insensible
// casse/accents/espaces via normalized_label) : la similarite floue pg_trgm
// (proposer une aptitude approchante malgre une faute de frappe) N'EST PAS
// cablee ici -- decision Killian (Lot 4 Mission 2, option (b) du rapport
// phase 0) : PostgREST n'expose ni l'operateur `%` de pg_trgm ni un tri par
// similarity() via une requete REST standard, seule une fonction SQL dediee
// le permettrait -- et ecrire cette fonction est une migration, hors
// perimetre d'une mission applicative. L'index GIN trigram pose en Mission 1
// (idx_job_skills_normalized_label_trgm) reste donc INUTILISE pour
// l'instant : CE N'EST PAS UN OUBLI, une mission dediee avec sa propre
// migration cablera "Vouliez-vous dire ?" dessus plus tard.
export async function searchJobSkills(
  client: Client,
  normalizedQuery: string,
  limit = 8
): Promise<JobSkill[]> {
  const { data, error } = await client
    .from('job_skills')
    .select('*')
    .ilike('normalized_label', `%${normalizedQuery}%`)
    .order('label', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data
}

// FIND-OR-CREATE (voir supabase/migrations/20260812130000_job_skills.sql,
// en-tete) : upsert avec ignoreDuplicates traduit exactement
// INSERT ... ON CONFLICT (normalized_label) DO NOTHING cote PostgREST --
// jamais DO UPDATE, aucune policy UPDATE n'existe sur job_skills (une
// aptitude ne se renomme pas, voir la migration). Si l'upsert ne retourne
// aucune ligne (conflit -> aptitude deja existante), re-selection par
// normalized_label (`normalizedLabel`, deja calcule par l'appelant) pour
// recuperer la ligne existante -- ce deuxieme temps garantit qu'aucun
// doublon n'est jamais cree, meme a la casse/aux accents pres.
export async function findOrCreateJobSkill(
  client: Client,
  label: string,
  normalizedLabel: string
): Promise<JobSkill> {
  const { data: inserted, error: upsertError } = await client
    .from('job_skills')
    .upsert({ label }, { onConflict: 'normalized_label', ignoreDuplicates: true })
    .select()
    .maybeSingle()

  if (upsertError) throw upsertError
  if (inserted) return inserted

  const { data: existing, error: selectError } = await client
    .from('job_skills')
    .select('*')
    .eq('normalized_label', normalizedLabel)
    .single()

  if (selectError) throw selectError
  return existing
}

export async function listJobApplications(
  client: Client,
  offerId: string
): Promise<JobApplication[]> {
  const { data, error } = await client
    .from('entity_job_applications')
    .select('*')
    .eq('offer_id', offerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateJobApplicationStatus(
  client: Client,
  applicationId: string,
  status: JobApplicationStatus
): Promise<void> {
  const { error } = await client
    .from('entity_job_applications')
    .update({ status })
    .eq('id', applicationId)

  if (error) throw error
}

// Utilisee par la Server Action publique de candidature : verifie que
// l'offre existe ET accepte encore les candidatures, sans jamais faire
// confiance a l'offer_id recu du client. Retourne null (pas d'exception)
// pour laisser l'appelant produire un message candidat propre plutot que
// de propager une erreur RLS/Postgres brute.
export async function getActiveJobOffer(client: Client, offerId: string): Promise<JobOffer | null> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*')
    .eq('id', offerId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data
}

export type CreateJobApplicationInput = {
  offer_id: string
  first_name: string
  last_name: string
  email: string
  message?: string | null
  resume_url?: string | null
  applicant_user_id?: string | null
  phone?: string | null
  location?: string | null
  session_number?: number
}

export async function createJobApplication(
  client: Client,
  input: CreateJobApplicationInput
): Promise<JobApplication> {
  const { data, error } = await client
    .from('entity_job_applications')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

type ApplicationWithOffer = JobApplication & {
  entity_job_offers: { title: string; entity_id: string } | null
}

export async function listMyApplications(
  client: Client,
  userId: string
): Promise<ApplicationWithOffer[]> {
  const { data, error } = await client
    .from('entity_job_applications')
    .select('*, entity_job_offers(title, entity_id)')
    .eq('applicant_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ApplicationWithOffer[]
}

export async function listActiveJobOffersByEntity(
  client: Client,
  entityId: string
): Promise<JobOfferWithMedia[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*, entity_job_offer_media(*), job_sectors(id, label)')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// entity(slug, display_name) embarque : la carte "offres similaires"
// (PublicJobOfferDetail.tsx) pointe vers une AUTRE entite -- son slug doit
// voyager avec la meme requete (aucune requete par carte, meme motif que le
// join media/secteur ci-dessus). isOneToOne false cote type genere (2
// entrees "entity_job_offers_entity_id_fkey" dans Relationships, dont une
// vers la vue publication_comments_with_author) -- nommer explicitement la
// relation cible ("entity") leve l'ambiguite, meme mecanisme que
// job_sectors(id, label) plus haut.
export type JobOfferWithMediaAndEntity = JobOfferWithMedia & {
  entity: Pick<Database['public']['Tables']['entity']['Row'], 'slug' | 'display_name'> | null
}

// Autres offres actives du meme profil, offre courante exclue -- section
// "Autres offres de ce profil" (PublicJobOfferDetail.tsx). Variante limitee
// de listActiveJobOffersByEntity ci-dessus (carrousel, pas une liste
// complete) : idx_entity_job_offers_entity_id (btree simple, pas partiel)
// sert le filtre entity_id ; status='active' reste un filtre residuel sur
// le petit sous-ensemble d'une seule entite, cout negligeable au volume
// actuel -- pas d'index compose necessaire.
export async function listOtherActiveJobOffersByEntity(
  client: Client,
  entityId: string,
  excludeOfferId: string,
  limit: number
): Promise<JobOfferWithMedia[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*, entity_job_offer_media(*), job_sectors(id, label)')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .neq('id', excludeOfferId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Offres actives du meme secteur, chez D'AUTRES entites -- section "Offres
// similaires" (decision Killian assumee : peut pointer vers un concurrent).
// idx_entity_job_offers_sector_id (index PARTIEL sur status = 'active',
// 20260804100000_job_sectors.sql) sert directement ce filtre -- cree
// precisement pour cet usage (voir commentaire de cette migration).
// entity_id != exclu reste un filtre residuel sur le sous-ensemble deja
// restreint au secteur.
export async function listSimilarActiveJobOffersBySector(
  client: Client,
  sectorId: string,
  excludeEntityId: string,
  limit: number
): Promise<JobOfferWithMediaAndEntity[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*, entity_job_offer_media(*), entity(slug, display_name)')
    .eq('sector_id', sectorId)
    .eq('status', 'active')
    .neq('entity_id', excludeEntityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as unknown as JobOfferWithMediaAndEntity[]
}

// Liste fermee geree par IBEE (voir 20260804100000_job_sectors.sql) - triee
// par display_order pour que "Autre" (valeur la plus elevee) apparaisse
// naturellement en dernier dans le selecteur du formulaire.
export async function listJobSectors(client: Client): Promise<JobSector[]> {
  const { data, error } = await client
    .from('job_sectors')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw error
  return data
}
