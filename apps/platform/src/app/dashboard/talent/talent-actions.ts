'use server'

import { createClient } from '@/lib/supabase/server'
import {
  createProjectJobOffer,
  updateProjectJobOffer,
  deleteProjectJobOffer,
  updateJobApplicationStatus,
} from '@ibee/supabase'
import { revalidatePath } from 'next/cache'
import type { HistoryBlock } from '@ibee/shared'
import type { JobApplicationStatus } from '@ibee/supabase'

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

export async function createJobOfferAction(
  entityId: string,
  input: {
    title: string
    contract_type: 'cdi' | 'cdd' | 'mission'
    status: 'active' | 'inactive'
    location_type: 'remote' | 'onsite' | 'hybrid'
    location_text?: string | null
    blocks: HistoryBlock[]
    compensation_type?: 'fixed' | 'percentage' | null
    compensation_amount?: number | null
    compensation_frequency?: 'weekly' | 'monthly' | 'mission' | null
    apply_url?: string | null
    end_date?: string | null
  },
) {
  const supabase = await createClient()
  await requireTalentPermission(supabase, entityId)
  requireFutureEndDate(input.end_date)
  await createProjectJobOffer(supabase, entityId, input)
  revalidatePath('/dashboard/talent')
}

export async function updateJobOfferAction(
  entityId: string,
  offerId: string,
  input: {
    title?: string
    contract_type?: 'cdi' | 'cdd' | 'mission'
    status?: 'active' | 'inactive'
    location_type?: 'remote' | 'onsite' | 'hybrid'
    location_text?: string | null
    blocks?: HistoryBlock[]
    compensation_type?: 'fixed' | 'percentage' | null
    compensation_amount?: number | null
    compensation_frequency?: 'weekly' | 'monthly' | 'mission' | null
    apply_url?: string | null
    end_date?: string | null
  },
) {
  const supabase = await createClient()
  await requireTalentPermission(supabase, entityId)

  if (input.status === 'active') {
    const { data: existingOffer } = await supabase
      .from('entity_job_offers')
      .select('status')
      .eq('id', offerId)
      .single()

    if (existingOffer && existingOffer.status === 'inactive') {
      await supabase
        .from('entity_job_applications')
        .update({ is_archived: true })
        .eq('offer_id', offerId)
        .eq('is_archived', false)
    }
  }

  await updateProjectJobOffer(supabase, entityId, offerId, input)
  revalidatePath('/dashboard/talent')
  revalidatePath(`/dashboard/talent/${offerId}`)
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
