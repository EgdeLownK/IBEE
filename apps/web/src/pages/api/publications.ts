/** @deprecated Phase 9 — création news via dashboard (`publication-actions`). Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import {
  createPublication,
  getEntityByUserId,
  purgeEntityCache,
  purgePublicationCache,
} from '@ibee/supabase'

const SITE_URL = import.meta.env.SITE_URL ?? 'http://localhost:4321'

function deriveTitle(content: string): string {
  const line = content.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  if (line.length > 0) return line.slice(0, 120)
  return 'Publication'
}

function appendPollToContent(
  content: string,
  poll: { question: string; options: string[] } | null
): string {
  if (!poll || !poll.question.trim()) return content
  const opts = poll.options.map((o) => o.trim()).filter(Boolean)
  if (opts.length < 2) return content
  const block =
    '\n\n📊 ' +
    poll.question.trim() +
    '\n' +
    opts.map((o) => '• ' + o).join('\n')
  return (content.trim() + block).trim()
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'Profil introuvable.' }), { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const rawContent = typeof body?.content === 'string' ? body.content.trim() : ''
  const mediaInput = Array.isArray(body?.media) ? body.media : []
  const poll =
    body?.poll && typeof body.poll === 'object'
      ? {
          question: typeof body.poll.question === 'string' ? body.poll.question : '',
          options: Array.isArray(body.poll.options)
            ? body.poll.options.filter((o: unknown) => typeof o === 'string')
            : [],
        }
      : null

  const media = mediaInput
    .filter(
      (m: unknown) =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as { url?: unknown }).url === 'string' &&
        ((m as { type?: unknown }).type === 'image' ||
          (m as { type?: unknown }).type === 'video')
    )
    .slice(0, 10)
    .map((m: { url: string; type: 'image' | 'video'; width?: number; height?: number }, i: number) => ({
      type: m.type,
      url: m.url,
      position: i,
      alt_text: null,
      width: typeof m.width === 'number' && m.width > 0 ? Math.round(m.width) : null,
      height: typeof m.height === 'number' && m.height > 0 ? Math.round(m.height) : null,
    }))

  const content = appendPollToContent(rawContent, poll)

  if (!content && media.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ajoute du texte, un média ou un sondage avant de publier.',
      }),
      { status: 400 }
    )
  }

  if (content.length > 10000) {
    return new Response(
      JSON.stringify({ success: false, error: 'Le texte ne peut pas dépasser 10 000 caractères.' }),
      { status: 400 }
    )
  }

  const title = deriveTitle(content || 'Publication')

  try {
    const publication = await createPublication(
      authClient,
      entity.id,
      { title, content: content || null, status: 'published' },
      media
    )

    await purgeEntityCache(entity.slug, SITE_URL)
    if (publication.slug) {
      await purgePublicationCache(entity.slug, publication.slug, SITE_URL)
    }

    return new Response(JSON.stringify({ success: true, publication }))
  } catch (err) {
    console.error('[api/publications] create', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur lors de la publication.' }),
      { status: 500 }
    )
  }
}
