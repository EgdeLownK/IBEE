import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

type Client = SupabaseClient<Database>

export type JobOfferStatus = Database['public']['Enums']['entity_job_status_v2']
export type JobContractType = Database['public']['Enums']['entity_job_contract_type']
export type JobLocationType = Database['public']['Enums']['entity_job_location_type']
export type JobCompType = Database['public']['Enums']['entity_job_comp_type']
export type JobCompFreq = Database['public']['Enums']['entity_job_comp_freq']

export type JobOffer = Database['public']['Tables']['entity_job_offers']['Row']

export type JobApplicationStatus = Database['public']['Enums']['entity_job_application_status']
export type JobApplication = Database['public']['Tables']['entity_job_applications']['Row']

export async function listProjectJobOffers(
  client: Client,
  entityId: string
): Promise<JobOffer[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProjectJobOffer(
  client: Client,
  entityId: string,
  offerId: string
): Promise<JobOffer> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*')
    .eq('id', offerId)
    .eq('entity_id', entityId)
    .single()

  if (error) throw error
  return data
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
): Promise<JobOffer[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
