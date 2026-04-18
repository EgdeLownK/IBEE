import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type PublicationInsert = Database['public']['Tables']['publications']['Insert']
type MediaInsert = Database['public']['Tables']['publication_media']['Insert']

export async function getPublicationsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { limit?: number; offset?: number; publicOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, publicOnly = true } = opts

  let query = client
    .from('publications')
    .select('*, publication_media(*)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (publicOnly) {
    query = query
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

export async function getPublicationById(
  client: SupabaseClient<Database>,
  publicationId: string
) {
  const { data, error } = await client
    .from('publications')
    .select('*, publication_media(*)')
    .eq('id', publicationId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getPublicationByEntityAndSlug(
  client: SupabaseClient<Database>,
  entityId: string,
  publicationSlug: string
) {
  const { data, error } = await client
    .from('publications')
    .select('*, publication_media(*)')
    .eq('entity_id', entityId)
    .eq('slug', publicationSlug)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createPublication(
  client: SupabaseClient<Database>,
  entityId: string,
  data: { title: string; content?: string | null; status: 'published' | 'scheduled'; scheduledFor?: string | null },
  media?: Omit<MediaInsert, 'publication_id'>[]
) {
  // slug est généré automatiquement par un trigger DB (generate_unique_publication_slug)
  const pubInsert = {
    entity_id: entityId,
    title: data.title,
    content: data.content ?? null,
    status: data.status,
    published_at: data.status === 'published' ? new Date().toISOString() : null,
    scheduled_for: data.status === 'scheduled' ? data.scheduledFor ?? null : null,
  } satisfies Omit<PublicationInsert, 'slug'>

  const { data: publication, error: pubError } = await client
    .from('publications')
    .insert(pubInsert as PublicationInsert)
    .select()
    .single()

  if (pubError) throw pubError

  if (media && media.length > 0) {
    const mediaInserts: MediaInsert[] = media.map((m, i) => ({
      ...m,
      publication_id: publication.id,
      position: m.position ?? i,
    }))

    const { error: mediaError } = await client
      .from('publication_media')
      .insert(mediaInserts)

    if (mediaError) throw mediaError
  }

  return publication
}

export async function updatePublication(
  client: SupabaseClient<Database>,
  publicationId: string,
  data: { title?: string; content?: string | null; status?: 'published' | 'scheduled'; scheduledFor?: string | null }
) {
  const update: Database['public']['Tables']['publications']['Update'] = {}

  if (data.title !== undefined) update.title = data.title
  if (data.content !== undefined) update.content = data.content
  if (data.status !== undefined) {
    update.status = data.status
    if (data.status === 'published') {
      update.published_at = new Date().toISOString()
      update.scheduled_for = null
    } else if (data.status === 'scheduled') {
      update.scheduled_for = data.scheduledFor ?? null
      update.published_at = null
    }
  }

  const { data: publication, error } = await client
    .from('publications')
    .update(update)
    .eq('id', publicationId)
    .select()
    .single()

  if (error) throw error
  return publication
}

export async function deletePublication(
  client: SupabaseClient<Database>,
  publicationId: string
) {
  const { error } = await client
    .from('publications')
    .delete()
    .eq('id', publicationId)

  if (error) throw error
}
