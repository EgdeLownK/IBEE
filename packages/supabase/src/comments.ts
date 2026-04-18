import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export interface CommentWithAuthor {
  id: string
  publication_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  author_entity_id: string
  author_display_name: string
  author_avatar_url: string | null
  author_slug: string
}

export async function getCommentsByPublication(
  client: SupabaseClient<Database>,
  publicationId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<CommentWithAuthor[]> {
  const { limit = 50, offset = 0 } = opts

  const { data, error } = await client
    .from('publication_comments_with_author' as any)
    .select('*')
    .eq('publication_id', publicationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return (data ?? []) as unknown as CommentWithAuthor[]
}

export async function createComment(
  client: SupabaseClient<Database>,
  publicationId: string,
  userId: string,
  content: string
) {
  const { data, error } = await client
    .from('publication_comments')
    .insert({
      publication_id: publicationId,
      user_id: userId,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateComment(
  client: SupabaseClient<Database>,
  commentId: string,
  content: string
) {
  const { data, error } = await client
    .from('publication_comments')
    .update({ content })
    .eq('id', commentId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteComment(
  client: SupabaseClient<Database>,
  commentId: string
) {
  const { error } = await client
    .from('publication_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}
