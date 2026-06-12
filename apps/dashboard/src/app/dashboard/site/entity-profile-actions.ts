'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import { getEntityByUserId, purgeEntityCache } from '@ibee/supabase'
import { buildEntityProfileUpdate, validateEntityProfile, type EntityProfileInput } from '@ibee/ui-server'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

async function requireEntity() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return null

  return { supabase, entity, userId: user.id }
}

function resolveImageType(file: File): string | null {
  if (IMAGE_TYPES.includes(file.type)) return file.type
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) {
    if (ext === 'png') return 'image/png'
    if (ext === 'webp') return 'image/webp'
    if (ext === 'gif') return 'image/gif'
    if (ext === 'avif') return 'image/avif'
    return 'image/jpeg'
  }
  return null
}

async function uploadProfileImage(
  file: File,
  entityId: string,
  kind: 'avatar' | 'banner'
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const contentType = resolveImageType(file)
  if (!contentType) {
    return { ok: false, error: 'Format non supporté (jpeg, png, webp, gif, avif).' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "L'image ne doit pas dépasser 10 Mo." }
  }

  const ctx = await requireEntity()
  if (!ctx) return { ok: false, error: 'Non authentifié.' }

  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/gif'
          ? 'gif'
          : contentType === 'image/avif'
            ? 'avif'
            : 'jpg'
  const path = `${ctx.entity.id}/profile/${kind}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await ctx.supabase.storage
    .from('publication-media')
    .upload(path, file, { contentType, upsert: false })

  if (uploadError) {
    console.error(`[uploadEntity${kind}]`, uploadError)
    return { ok: false, error: "Erreur lors de l'envoi de l'image." }
  }

  const { data } = ctx.supabase.storage.from('publication-media').getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

function revalidateProfilePaths(slug: string) {
  revalidateAfterEntityMutation(slug, { studioExtras: ['/dashboard/site/general'] })
}

export async function uploadEntityAvatarAction(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Aucun fichier fourni.' }
  }

  const ctx = await requireEntity()
  if (!ctx) return { ok: false as const, error: 'Non authentifié.' }

  const uploaded = await uploadProfileImage(file, ctx.entity.id, 'avatar')
  if (!uploaded.ok) return { ok: false as const, error: uploaded.error }

  const { error } = await ctx.supabase
    .from('entity')
    .update({ avatar_url: uploaded.url })
    .eq('id', ctx.entity.id)

  if (error) {
    console.error('[uploadEntityAvatarAction] update', error)
    return { ok: false as const, error: 'Erreur lors de la mise à jour du profil.' }
  }

  void purgeEntityCache(ctx.entity.slug, siteUrl())
  revalidateProfilePaths(ctx.entity.slug)
  return { ok: true as const, url: uploaded.url }
}

export async function deleteEntityAvatarAction() {
  const ctx = await requireEntity()
  if (!ctx) return { ok: false as const, error: 'Non authentifié.' }

  const { error } = await ctx.supabase
    .from('entity')
    .update({ avatar_url: null })
    .eq('id', ctx.entity.id)

  if (error) {
    console.error('[deleteEntityAvatarAction]', error)
    return { ok: false as const, error: 'Erreur lors de la suppression.' }
  }

  void purgeEntityCache(ctx.entity.slug, siteUrl())
  revalidateProfilePaths(ctx.entity.slug)
  return { ok: true as const }
}

export async function uploadEntityBannerAction(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Aucun fichier fourni.' }
  }

  const ctx = await requireEntity()
  if (!ctx) return { ok: false as const, error: 'Non authentifié.' }

  const uploaded = await uploadProfileImage(file, ctx.entity.id, 'banner')
  if (!uploaded.ok) return { ok: false as const, error: uploaded.error }

  const { error } = await ctx.supabase
    .from('entity')
    .update({ banner_url: uploaded.url })
    .eq('id', ctx.entity.id)

  if (error) {
    console.error('[uploadEntityBannerAction] update', error)
    return { ok: false as const, error: 'Erreur lors de la mise à jour de la bannière.' }
  }

  void purgeEntityCache(ctx.entity.slug, siteUrl())
  revalidateProfilePaths(ctx.entity.slug)
  return { ok: true as const, url: uploaded.url }
}

export async function deleteEntityBannerAction() {
  const ctx = await requireEntity()
  if (!ctx) return { ok: false as const, error: 'Non authentifié.' }

  const { error } = await ctx.supabase
    .from('entity')
    .update({ banner_url: null })
    .eq('id', ctx.entity.id)

  if (error) {
    console.error('[deleteEntityBannerAction]', error)
    return { ok: false as const, error: 'Erreur lors de la suppression.' }
  }

  void purgeEntityCache(ctx.entity.slug, siteUrl())
  revalidateProfilePaths(ctx.entity.slug)
  return { ok: true as const }
}

export async function updateEntityProfileAction(input: EntityProfileInput) {
  const validation = validateEntityProfile(input)
  if (!validation.ok) {
    return {
      ok: false as const,
      error: 'Données invalides.',
      fieldErrors: validation.fieldErrors,
    }
  }

  const ctx = await requireEntity()
  if (!ctx) return { ok: false as const, error: 'Non authentifié.' }

  const patch = buildEntityProfileUpdate(input)
  const { error } = await ctx.supabase.from('entity').update(patch).eq('id', ctx.entity.id)

  if (error) {
    console.error('[updateEntityProfileAction]', error)
    return { ok: false as const, error: 'Erreur lors de l\'enregistrement.' }
  }

  void purgeEntityCache(ctx.entity.slug, siteUrl())
  revalidateProfilePaths(ctx.entity.slug)

  return {
    ok: true as const,
    entity: {
      display_name: patch.display_name,
      role: patch.role,
      bio: patch.bio,
      location: patch.location,
    },
  }
}
