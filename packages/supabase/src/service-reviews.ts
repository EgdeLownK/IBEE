import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type ServiceReviewAggregates = {
  count: number
  average: number
}

// ---------------------------------------------------------------------------
// Lecture publique (miroir de product-reviews — le dépôt d'avis viendra
// avec l'historique de réservations)
// ---------------------------------------------------------------------------

/**
 * Liste les avis publiés d'un service avec pagination, filtre notes et tri.
 */
export async function listPublishedServiceReviews(
  client: SupabaseClient<Database>,
  appointmentTypeId: string,
  opts: {
    /** Multi-sélection d'étoiles. */
    ratings?: number[]
    sortBy?: 'recent' | 'oldest'
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 20, offset = 0, sortBy = 'recent' } = opts

  let query = client
    .from('service_reviews')
    .select('*')
    .eq('appointment_type_id', appointmentTypeId)
    .eq('status', 'published')
    .range(offset, offset + limit - 1)

  if (opts.ratings && opts.ratings.length > 0) {
    query = query.in('rating', opts.ratings)
  }

  query = query.order('created_at', { ascending: sortBy === 'oldest' })

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Agrégats (moyenne et nombre) des avis publiés d'un service.
 * Calculé côté JS — pas de RPC cette phase (même doctrine que produits).
 */
export async function getServiceReviewAggregates(
  client: SupabaseClient<Database>,
  appointmentTypeId: string
): Promise<ServiceReviewAggregates> {
  const { data, error } = await client
    .from('service_reviews')
    .select('rating')
    .eq('appointment_type_id', appointmentTypeId)
    .eq('status', 'published')

  if (error) throw error
  const ratings = (data ?? []).map((r) => r.rating)
  const count = ratings.length
  const average = count > 0 ? ratings.reduce((sum, r) => sum + r, 0) / count : 0
  return { count, average }
}
