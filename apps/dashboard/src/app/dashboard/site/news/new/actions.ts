'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, createPublication, updatePublication, getPublicationById, purgeEntityCache, purgePublicationCache } from '@agora/supabase'

const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'

const publishSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(120, 'Le titre ne peut pas dépasser 120 caractères').trim(),
  content: z.string().max(10000, 'Le texte ne peut pas dépasser 10 000 caractères').trim().nullable().transform(v => v === '' ? null : v),
  status: z.enum(['published', 'scheduled']),
  scheduledFor: z.string().nullable().optional(),
  media: z.array(z.object({
    url: z.string().url(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })).default([]),
}).refine(
  (data) => (data.content && data.content.length > 0) || data.media.length > 0,
  { message: 'Ajoutez du texte ou au moins une image', path: ['content'] }
).refine(
  (data) => data.status !== 'scheduled' || (data.scheduledFor && new Date(data.scheduledFor) > new Date()),
  { message: 'La date de programmation doit être dans le futur', path: ['scheduledFor'] }
)

export type PublishResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

async function ensureNewsSectionActive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string
) {
  const { data: existing } = await supabase
    .from('entity_menu_sections')
    .select('id, is_active')
    .eq('entity_id', entityId)
    .eq('type', 'news')
    .maybeSingle()

  if (!existing) {
    await supabase.from('entity_menu_sections').insert({
      entity_id: entityId,
      type: 'news',
      is_active: true,
      is_configured: true,
      position: 1,
    })
  } else if (!existing.is_active) {
    await supabase
      .from('entity_menu_sections')
      .update({ is_active: true })
      .eq('id', existing.id)
  }
}

export async function publishPublication(input: {
  title: string
  content: string | null
  status: 'published' | 'scheduled'
  scheduledFor?: string | null
  media: { url: string; width?: number; height?: number }[]
}): Promise<PublishResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = publishSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0]
      if (key) fieldErrors[String(key)] = issue.message
    })
    return { success: false, error: 'Données invalides', fieldErrors }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    const media = parsed.data.media.map((m, i) => ({
      type: 'image' as const,
      url: m.url,
      position: i,
      width: m.width ?? null,
      height: m.height ?? null,
    }))

    await createPublication(
      supabase,
      entity.id,
      {
        title: parsed.data.title,
        content: parsed.data.content,
        status: parsed.data.status,
        scheduledFor: parsed.data.scheduledFor ?? null,
      },
      media.length > 0 ? media : undefined
    )

    // Activate the News section if not already active
    await ensureNewsSectionActive(supabase, entity.id)

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/news')
  } catch (err) {
    console.error('[publishPublication]', err)
    return { success: false, error: 'Erreur lors de la publication' }
  }

  redirect('/dashboard/site/news?toast=created')
}

// --- Update publication ---

const updateSchema = z.object({
  publicationId: z.string().uuid(),
  content: z.string().max(10000).trim().nullable().transform(v => v === '' ? null : v),
  status: z.enum(['published', 'scheduled']),
  scheduledFor: z.string().nullable().optional(),
})

export type UpdatePublicationResult =
  | { success: true }
  | { success: false; error: string }

export async function updatePublicationAction(input: {
  publicationId: string
  content: string | null
  status: 'published' | 'scheduled'
  scheduledFor?: string | null
}): Promise<UpdatePublicationResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const publication = await getPublicationById(supabase, parsed.data.publicationId)
  if (!publication) return { success: false, error: 'Publication introuvable' }

  try {
    await updatePublication(supabase, parsed.data.publicationId, {
      content: parsed.data.content,
      status: parsed.data.status,
      scheduledFor: parsed.data.scheduledFor ?? null,
    })

    await purgePublicationCache(entity.slug, publication.slug, siteUrl)
    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/news')
  } catch (err) {
    console.error('[updatePublicationAction]', err)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  redirect('/dashboard/site/news?toast=updated')
}
