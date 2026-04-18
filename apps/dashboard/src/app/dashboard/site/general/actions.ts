'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@agora/supabase'
import { getEntityByUserId, purgeEntityCache } from '@agora/supabase'

type EntityUpdate = Database['public']['Tables']['entity']['Update']

const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'

const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(60, 'Le nom ne peut pas dépasser 60 caractères')
    .trim(),
  role: z
    .string()
    .max(100, 'Le rôle ne peut pas dépasser 100 caractères')
    .trim()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  location: z
    .string()
    .max(100, 'La localisation ne peut pas dépasser 100 caractères')
    .trim()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  bio: z
    .string()
    .max(300, 'La bio ne peut pas dépasser 300 caractères')
    .trim()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
})

// --- Save on blur : update d'un seul champ ---

export type UpdateFieldResult =
  | { success: true }
  | { success: false; error: string }

export async function updateProfileField(
  field: 'display_name' | 'role' | 'location' | 'bio',
  value: string | null
): Promise<UpdateFieldResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Non authentifié' }
  }

  // Validation par champ via le schéma existant
  const fieldSchema = updateProfileSchema.shape[field]
  const parsed = fieldSchema.safeParse(value)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Valeur invalide',
    }
  }

  const updateData = { [field]: parsed.data } as EntityUpdate

  const { error } = await supabase
    .from('entity')
    .update(updateData)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (entity) await purgeEntityCache(entity.slug, siteUrl)

  revalidatePath('/dashboard/site/general')
  return { success: true }
}

// --- Avatar ---

export async function updateAvatar(
  avatarUrl: string
): Promise<UpdateFieldResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Non authentifié' }
  }

  const { error } = await supabase
    .from('entity')
    .update({ avatar_url: avatarUrl } as EntityUpdate)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (entity) await purgeEntityCache(entity.slug, siteUrl)

  revalidatePath('/dashboard/site/general')
  return { success: true }
}

export async function deleteAvatar(): Promise<UpdateFieldResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Non authentifié' }
  }

  // Suppression du fichier Storage (ignore l'erreur si inexistant)
  await supabase.storage.from('avatars').remove([`${user.id}/avatar.webp`])

  const { error } = await supabase
    .from('entity')
    .update({ avatar_url: null } as EntityUpdate)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (entity) await purgeEntityCache(entity.slug, siteUrl)

  revalidatePath('/dashboard/site/general')
  return { success: true }
}
