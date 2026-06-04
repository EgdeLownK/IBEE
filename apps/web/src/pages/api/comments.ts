import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { createComment, deleteComment, getPublicationById, getEntityBySlug, purgePublicationCache } from '@ibee/supabase'

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté pour commenter.' }), { status: 401 })
  }

  const body = await request.json()
  const { publicationId, content, entitySlug, publicationSlug } = body

  if (!publicationId || !content || !entitySlug || !publicationSlug) {
    return new Response(JSON.stringify({ error: 'Champs requis manquants.' }), { status: 400 })
  }

  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > 2000) {
    return new Response(JSON.stringify({ error: 'Le commentaire doit contenir entre 1 et 2000 caractères.' }), { status: 400 })
  }

  try {
    const comment = await createComment(authClient, publicationId, user.id, trimmed)

    const siteUrl = import.meta.env.SITE_URL ?? ''
    await purgePublicationCache(entitySlug, publicationSlug, siteUrl)

    return new Response(JSON.stringify({ success: true, comment }))
  } catch (err: any) {
    // RLS rate limit triggers a PostgreSQL error
    if (err?.code === '42501' || err?.message?.includes('check_comment_rate_limit')) {
      return new Response(JSON.stringify({ error: 'Veuillez attendre une minute avant de poster un nouveau commentaire.' }), { status: 429 })
    }
    console.error('[api/comments] POST', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de la publication du commentaire.' }), { status: 500 })
  }
}

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json()
  const { commentId, entitySlug, publicationSlug } = body

  if (!commentId || !entitySlug || !publicationSlug) {
    return new Response(JSON.stringify({ error: 'Champs requis manquants.' }), { status: 400 })
  }

  try {
    // RLS handles authorization (own comment OR publication owner)
    await deleteComment(authClient, commentId)

    const siteUrl = import.meta.env.SITE_URL ?? ''
    await purgePublicationCache(entitySlug, publicationSlug, siteUrl)

    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('[api/comments] DELETE', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de la suppression.' }), { status: 500 })
  }
}
