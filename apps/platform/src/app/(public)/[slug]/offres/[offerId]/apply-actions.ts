'use server'

import { createClient } from '@/lib/supabase/server'
import { createJobApplication, getActiveJobOffer } from '@ibee/supabase'
import { ApplyFieldsSchema, OfferIdSchema } from './apply-schema'

export type ApplyFormInput = {
  offer_id: string
  first_name: string
  last_name: string
  email: string
  message?: string
}

// Code Postgres "insufficient_privilege" : la policy RLS
// entity_job_apps_public_insert refuse l'insert (offre fermee/supprimee
// entre le controle getActiveJobOffer ci-dessous et l'insert). Rare
// (fenetre de course) mais possible — traite comme le meme cas metier
// que "offre introuvable", jamais comme une erreur technique brute.
const RLS_INSUFFICIENT_PRIVILEGE = '42501'

export async function createJobApplicationAction(
  input: ApplyFormInput,
): Promise<{ error?: string }> {
  const offerIdResult = OfferIdSchema.safeParse(input.offer_id)
  if (!offerIdResult.success) {
    // uuid malforme = jamais un vrai formulaire (offer_id vient d'un lien,
    // pas d'une saisie) : forcement un appel direct a la Server Action.
    return { error: 'Requête invalide.' }
  }

  const fieldsResult = ApplyFieldsSchema.safeParse(input)
  if (!fieldsResult.success) {
    return { error: fieldsResult.error.issues[0]?.message ?? 'Formulaire invalide.' }
  }

  const supabase = await createClient()

  const offer = await getActiveJobOffer(supabase, offerIdResult.data)
  if (!offer) {
    return { error: "Cette offre n'est plus disponible." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    await createJobApplication(supabase, {
      offer_id: offerIdResult.data,
      first_name: fieldsResult.data.first_name,
      last_name: fieldsResult.data.last_name,
      email: fieldsResult.data.email,
      message: fieldsResult.data.message ?? null,
      applicant_user_id: user?.id ?? null,
      // Fige la vague de recrutement courante sur la candidature : offer
      // vient de getActiveJobOffer ci-dessus, jamais du client.
      session_number: offer.session_count,
    })
    return {}
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code
    if (code === RLS_INSUFFICIENT_PRIVILEGE) {
      return { error: "Cette offre n'est plus disponible." }
    }
    console.error('[createJobApplicationAction]', err)
    return { error: 'Une erreur est survenue, merci de réessayer.' }
  }
}
