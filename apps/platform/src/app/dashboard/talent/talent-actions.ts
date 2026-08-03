'use server'

import { createClient } from '@/lib/supabase/server'
import {
  createProjectJobOffer,
  updateProjectJobOffer,
  deleteProjectJobOffer,
  updateJobApplicationStatus,
  listJobOfferMedia,
  addJobOfferMedia,
  replaceJobOfferMedia,
} from '@ibee/supabase'
import { revalidatePath } from 'next/cache'
import type { HistoryBlock } from '@ibee/shared'
import type { JobApplicationStatus, JobContractType, JobOfferMediaType } from '@ibee/supabase'

type JobOfferMediaInput = { url: string; type: JobOfferMediaType; alt_text?: string | null }

// Limites de nombre proposees par la mission "feat/job-offer-media-form",
// A VALIDER PAR KILLIAN avant mise en production : miroir des limites deja
// en vigueur cote boutique (StepEssentials.tsx:228-234 - 10 medias, 1 video
// max), reprises par defaut faute de besoin metier connu specifique aux
// offres d'emploi. Verifiees ici cote serveur (pas seulement dans
// JobOfferDialog.tsx) : un appel direct a l'action, sans passer par le
// formulaire, ne peut pas les contourner - meme motif que
// requireCompensation/requireLocationText ci-dessous.
const MAX_JOB_OFFER_MEDIA = 10
const MAX_JOB_OFFER_VIDEOS = 1

function requireMediaLimits(media: JobOfferMediaInput[] | undefined) {
  if (!media || media.length === 0) return
  if (media.length > MAX_JOB_OFFER_MEDIA) {
    throw new Error(`Maximum ${MAX_JOB_OFFER_MEDIA} médias.`)
  }
  const videoCount = media.filter((m) => m.type === 'video').length
  if (videoCount > MAX_JOB_OFFER_VIDEOS) {
    throw new Error(
      MAX_JOB_OFFER_VIDEOS === 1
        ? 'Une seule vidéo est autorisée.'
        : `Maximum ${MAX_JOB_OFFER_VIDEOS} vidéos.`,
    )
  }
}

// Une Server Action est un point d'entree HTTP public : entityId (et
// applicationId pour updateApplicationStatusAction) arrivent du client, sans
// garantie qu'ils appartiennent a l'appelant. auth.getUser() etablit
// l'identite server-side, puis la RPC entity_user_has_permission (definie en
// base, policies RLS entity_job_offers/entity_job_applications) est la seule
// source de verite sur le droit d'agir - proprietaire OU membre d'equipe avec
// la permission 'talent'. Voir .claude/rules/server-actions.md.
async function requireTalentPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('[talent-actions] refus : appel non authentifie')
    throw new Error('Vous devez être connecté pour effectuer cette action.')
  }

  const { data: hasPermission, error } = await supabase.rpc('entity_user_has_permission', {
    p_entity_id: entityId,
    p_permission: 'talent',
  })
  if (error) throw error

  if (!hasPermission) {
    console.error(
      `[talent-actions] refus : utilisateur ${user.id} sans permission 'talent' sur l'entite ${entityId}`,
    )
    throw new Error("Vous n'avez pas les droits sur cette offre d'emploi.")
  }
}

// Comparaison en chaine ISO ('YYYY-MM-DD', format exact d'un <input
// type="date">) plutot qu'en objets Date : evite tout ecart de fuseau
// horaire entre la date saisie (sans heure) et "aujourd'hui" cote serveur.
function requireFutureEndDate(endDate: string | null | undefined) {
  if (!endDate) return
  const today = new Date().toISOString().slice(0, 10)
  if (endDate <= today) {
    throw new Error('La date de fin doit être postérieure à aujourd’hui.')
  }
}

// Rémunération obligatoire a la creation (decision Killian) : type + montant
// + frequence doivent tous etre renseignes. Appelee uniquement dans
// createJobOfferAction - jamais dans updateJobOfferAction, dont le type
// d'entree reste optionnel pour ne pas casser la bascule de statut du menu
// trois points (updateJobOfferAction(entityId, offerId, { status })).
function requireCompensation(input: {
  compensation_type?: 'fixed' | 'percentage' | null
  compensation_amount?: number | null
  compensation_frequency?: 'weekly' | 'monthly' | 'mission' | null
}) {
  if (!input.compensation_type || !input.compensation_frequency) {
    throw new Error('Veuillez renseigner le type et la fréquence de la rémunération.')
  }
  if (input.compensation_amount == null || input.compensation_amount <= 0) {
    throw new Error('Veuillez renseigner le montant de la rémunération.')
  }
}

// Localisation obligatoire a la creation pour "Sur site"/"Hybride" (decision
// Killian) - jamais pour "100% Teletravail", ou le champ est masque cote
// formulaire. Meme portee restreinte a createJobOfferAction que
// requireCompensation ci-dessus.
function requireLocationText(
  locationType: 'remote' | 'onsite' | 'hybrid',
  locationText: string | null | undefined,
) {
  if (locationType !== 'remote' && !locationText?.trim()) {
    throw new Error('Veuillez renseigner la localisation.')
  }
}

// Secteur obligatoire a la creation (decision Killian, mission
// feat/job-offer-sector-ui) - meme portee restreinte a createJobOfferAction
// que requireCompensation/requireLocationText : les offres existantes sans
// secteur (posees avant ce champ) ne sont jamais revalidees ici, seul le
// gate cote client (JobOfferDialog, etape 1 "Vitrine") le redemande a la
// prochaine ouverture du formulaire d'edition.
function requireSector(sectorId: string | null | undefined) {
  if (!sectorId) {
    throw new Error("Veuillez sélectionner un secteur d'activité.")
  }
}

export async function createJobOfferAction(
  entityId: string,
  input: {
    title: string
    contract_type: JobContractType
    status: 'active' | 'inactive'
    location_type: 'remote' | 'onsite' | 'hybrid'
    location_text?: string | null
    blocks: HistoryBlock[]
    compensation_type?: 'fixed' | 'percentage' | null
    compensation_amount?: number | null
    compensation_frequency?: 'weekly' | 'monthly' | 'mission' | null
    apply_url?: string | null
    end_date?: string | null
    is_cadre?: boolean | null
    sector_id?: string | null
    media?: JobOfferMediaInput[]
  },
) {
  const supabase = await createClient()
  await requireTalentPermission(supabase, entityId)
  requireFutureEndDate(input.end_date)
  requireCompensation(input)
  requireLocationText(input.location_type, input.location_text)
  requireSector(input.sector_id)
  requireMediaLimits(input.media)

  // media n'est pas une colonne d'entity_job_offers (table entity_job_offer_media
  // separee) - retiree avant l'insert, reinseree ensuite via addJobOfferMedia
  // une fois l'offre creee et son id connu. Meme flux que createProductAction
  // (product-actions.ts) : offre creee d'abord, medias inseres ensuite, deux
  // operations sequentielles (pas de transaction unique possible ici non plus).
  const { media, ...offerInput } = input
  const created = await createProjectJobOffer(supabase, entityId, offerInput)

  if (media && media.length > 0) {
    await addJobOfferMedia(
      supabase,
      created.id,
      media.map((m) => ({ url: m.url, media_type: m.type, alt_text: m.alt_text ?? null })),
    )
  }

  revalidatePath('/dashboard/talent')
}

export async function updateJobOfferAction(
  entityId: string,
  offerId: string,
  input: {
    title?: string
    contract_type?: JobContractType
    status?: 'active' | 'inactive'
    location_type?: 'remote' | 'onsite' | 'hybrid'
    location_text?: string | null
    blocks?: HistoryBlock[]
    compensation_type?: 'fixed' | 'percentage' | null
    compensation_amount?: number | null
    compensation_frequency?: 'weekly' | 'monthly' | 'mission' | null
    apply_url?: string | null
    end_date?: string | null
    is_cadre?: boolean | null
    sector_id?: string | null
    // Absent = ne touche pas les medias existants (ex. bascule de statut
    // depuis le menu trois points, updateJobOfferAction(id, id, { status })
    // - voir requireCompensation ci-dessus, meme motif de portee restreinte).
    // Tableau (vide inclus) = remplacement integral via replaceJobOfferMedia.
    media?: JobOfferMediaInput[]
  },
) {
  const supabase = await createClient()
  await requireTalentPermission(supabase, entityId)
  requireMediaLimits(input.media)

  if (input.status === 'active') {
    const { data: existingOffer } = await supabase
      .from('entity_job_offers')
      .select('status')
      .eq('id', offerId)
      .single()

    if (existingOffer && existingOffer.status === 'inactive') {
      // relaunch_job_offer (SECURITY DEFINER) archive les candidatures
      // actives ET incremente session_count dans une seule transaction -
      // supabase-js ne permet aucune transaction multi-requetes, impossible
      // a garantir avec deux .update() separes. Le controle de permission
      // cote base (entity_user_has_permission) y est revalide en interne :
      // requireTalentPermission ci-dessus reste la premiere ligne de
      // defense cote application, la RPC en est la doublure, pas un
      // remplacement.
      const { error: relaunchError } = await supabase.rpc('relaunch_job_offer', {
        p_offer_id: offerId,
      })
      if (relaunchError) throw relaunchError
    }
  }

  const { media, ...offerInput } = input
  await updateProjectJobOffer(supabase, entityId, offerId, offerInput)

  if (media !== undefined) {
    await replaceJobOfferMedia(
      supabase,
      offerId,
      media.map((m) => ({ url: m.url, media_type: m.type, alt_text: m.alt_text ?? null })),
    )
  }

  revalidatePath('/dashboard/talent')
  revalidatePath(`/dashboard/talent/${offerId}`)
}

// Lecture des medias d'une offre pour prefill du formulaire d'edition
// (JobOfferDialog.tsx) - meme garde requireTalentPermission que les autres
// actions de ce fichier, pas seulement RLS (.claude/rules/server-actions.md).
export async function getJobOfferMediaAction(entityId: string, offerId: string) {
  const supabase = await createClient()
  await requireTalentPermission(supabase, entityId)
  return listJobOfferMedia(supabase, offerId)
}

export async function deleteJobOfferAction(entityId: string, offerId: string) {
  const supabase = await createClient()
  await requireTalentPermission(supabase, entityId)
  await deleteProjectJobOffer(supabase, entityId, offerId)
  revalidatePath('/dashboard/talent')
}

export async function updateApplicationStatusAction(
  applicationId: string,
  status: JobApplicationStatus,
  offerId: string,
) {
  const supabase = await createClient()

  // Ni entityId ni offerId ne sont fournis de confiance ici : offerId n'est
  // utilise que pour revalidatePath (cache), jamais pour l'autorisation.
  // La chaine candidature -> offre -> entite est reresolue depuis la BDD a
  // partir du seul applicationId, pour verifier la permission sur l'entite
  // reellement proprietaire de cette candidature.
  const { data: application, error: applicationError } = await supabase
    .from('entity_job_applications')
    .select('offer_id')
    .eq('id', applicationId)
    .maybeSingle()
  if (applicationError) throw applicationError
  if (!application) {
    console.error(`[talent-actions] refus : candidature ${applicationId} introuvable`)
    throw new Error('Candidature introuvable.')
  }

  const { data: offer, error: offerError } = await supabase
    .from('entity_job_offers')
    .select('entity_id')
    .eq('id', application.offer_id)
    .maybeSingle()
  if (offerError) throw offerError
  if (!offer) {
    console.error(`[talent-actions] refus : offre ${application.offer_id} introuvable`)
    throw new Error('Offre introuvable.')
  }

  await requireTalentPermission(supabase, offer.entity_id)

  await updateJobApplicationStatus(supabase, applicationId, status)
  revalidatePath(`/dashboard/talent/${offerId}`)
}
