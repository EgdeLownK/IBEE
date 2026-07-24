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
  },
) {
  const supabase = await createClient()
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
  },
) {
  const supabase = await createClient()

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
  await deleteProjectJobOffer(supabase, entityId, offerId)
  revalidatePath('/dashboard/talent')
}

export async function updateApplicationStatusAction(
  applicationId: string,
  status: JobApplicationStatus,
  offerId: string,
) {
  const supabase = await createClient()
  await updateJobApplicationStatus(supabase, applicationId, status)
  revalidatePath(`/dashboard/talent/${offerId}`)
}
