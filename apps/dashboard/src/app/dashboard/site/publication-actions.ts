'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import {
  createPublication,
  deletePublication,
  getEntityByUserId,
  getPublicationById,
  purgeEntityCache,
  purgePublicationCache,
  updatePublication,
} from '@ibee/supabase'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 200 * 1024 * 1024

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

export async function uploadPublicationMediaAction(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Aucun fichier fourni.' }
  }

  let mediaType: 'image' | 'video'
  if (IMAGE_TYPES.includes(file.type)) {
    mediaType = 'image'
  } else if (VIDEO_TYPES.includes(file.type)) {
    mediaType = 'video'
  } else {
    return { ok: false as const, error: 'Format non supporté.' }
  }

  if (mediaType === 'image' && file.size > MAX_IMAGE_BYTES) {
    return { ok: false as const, error: 'L\'image ne doit pas dépasser 10 Mo.' }
  }
  if (mediaType === 'video' && file.size > MAX_VIDEO_BYTES) {
    return { ok: false as const, error: 'La vidéo ne doit pas dépasser 200 Mo.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${user.id}/${crypto.randomUUID()}/${mediaType}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('publication-media')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      console.error('[uploadPublicationMediaAction]', uploadError)
      return { ok: false as const, error: 'Erreur lors de l\'envoi du fichier.' }
    }

    const { data } = supabase.storage.from('publication-media').getPublicUrl(path)
    return { ok: true as const, url: data.publicUrl, type: mediaType }
  } catch (err) {
    console.error('[uploadPublicationMediaAction]', err)
    return { ok: false as const, error: 'Erreur lors de l\'envoi du fichier.' }
  }
}

export type CreatePublicationInput = {
  content: string
  poll: { question: string; options: string[] } | null
  media: { url: string; type: 'image' | 'video'; width?: number | null; height?: number | null }[]
}

export async function createPublicationAction(input: CreatePublicationInput) {
  const rawContent = typeof input.content === 'string' ? input.content.trim() : ''
  const mediaInput = Array.isArray(input.media) ? input.media : []
  const poll = input.poll

  const media = mediaInput
    .filter((m) => m && typeof m.url === 'string' && (m.type === 'image' || m.type === 'video'))
    .slice(0, 10)
    .map((m, i) => ({
      type: m.type,
      url: m.url,
      position: i,
      alt_text: null,
      width: typeof m.width === 'number' && m.width > 0 ? Math.round(m.width) : null,
      height: typeof m.height === 'number' && m.height > 0 ? Math.round(m.height) : null,
    }))

  const content = appendPollToContent(rawContent, poll)

  if (!content && media.length === 0) {
    return { ok: false as const, error: 'Ajoute du texte, un média ou un sondage avant de publier.' }
  }
  if (content.length > 10000) {
    return { ok: false as const, error: 'Le texte ne peut pas dépasser 10 000 caractères.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    const title = deriveTitle(content || 'Publication')
    const publication = await createPublication(
      supabase,
      entity.id,
      { title, content: content || null, status: 'published' },
      media
    )

    void purgeEntityCache(entity.slug, siteUrl())
    if (publication.slug) {
      void purgePublicationCache(entity.slug, publication.slug, siteUrl())
    }
    revalidateAfterEntityMutation(entity.slug, {
      publicationSlug: publication.slug ?? undefined,
    })

    return { ok: true as const, publication }
  } catch (err) {
    console.error('[createPublicationAction]', err)
    return { ok: false as const, error: 'Erreur lors de la publication.' }
  }
}

async function assertOwnedPublication(publicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non authentifié.' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

  const publication = await getPublicationById(supabase, publicationId)
  if (!publication || publication.entity_id !== entity.id) {
    return { ok: false as const, error: 'Publication introuvable.' }
  }

  return { ok: true as const, supabase, entity, publication }
}

export async function deletePublicationAction(publicationId: string) {
  if (!publicationId) return { ok: false as const, error: 'Publication invalide.' }

  try {
    const ctx = await assertOwnedPublication(publicationId)
    if (!ctx.ok) return ctx

    await deletePublication(ctx.supabase, publicationId)

    void purgeEntityCache(ctx.entity.slug, siteUrl())
    if (ctx.publication.slug) {
      void purgePublicationCache(ctx.entity.slug, ctx.publication.slug, siteUrl())
    }
    revalidateAfterEntityMutation(ctx.entity.slug, {
      publicationSlug: ctx.publication.slug ?? undefined,
    })

    return { ok: true as const }
  } catch (err) {
    console.error('[deletePublicationAction]', err)
    return { ok: false as const, error: 'Erreur lors de la suppression.' }
  }
}

export async function updatePublicationContentAction(publicationId: string, content: string) {
  const trimmed = typeof content === 'string' ? content.trim() : ''
  if (!publicationId) return { ok: false as const, error: 'Publication invalide.' }
  if (!trimmed) return { ok: false as const, error: 'Le contenu ne peut pas être vide.' }
  if (trimmed.length > 10000) {
    return { ok: false as const, error: 'Le texte ne peut pas dépasser 10 000 caractères.' }
  }

  try {
    const ctx = await assertOwnedPublication(publicationId)
    if (!ctx.ok) return ctx

    const title = deriveTitle(trimmed)
    const publication = await updatePublication(ctx.supabase, publicationId, {
      title,
      content: trimmed,
    })

    void purgeEntityCache(ctx.entity.slug, siteUrl())
    if (publication.slug) {
      void purgePublicationCache(ctx.entity.slug, publication.slug, siteUrl())
    }
    revalidateAfterEntityMutation(ctx.entity.slug, {
      publicationSlug: publication.slug ?? undefined,
    })

    return { ok: true as const, publication }
  } catch (err) {
    console.error('[updatePublicationContentAction]', err)
    return { ok: false as const, error: 'Erreur lors de la modification.' }
  }
}
