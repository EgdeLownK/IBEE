'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import {
  activateEntityMenuSection,
  deactivateEntityMenuSection,
  getEntityByUserId,
  isMenuSectionType,
  purgeEntityCache,
} from '@ibee/supabase'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

async function requireEntity() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) throw new Error('Profil introuvable')

  return { supabase, entity }
}

export async function addMenuSectionAction(type: string) {
  if (!isMenuSectionType(type)) {
    return { ok: false as const, error: 'Type de menu invalide.' }
  }

  try {
    const { supabase, entity } = await requireEntity()
    await activateEntityMenuSection(supabase, entity.id, type)
    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)
    return { ok: true as const, type }
  } catch (err) {
    console.error('[addMenuSectionAction]', err)
    return { ok: false as const, error: 'Impossible d\'ajouter cet onglet.' }
  }
}

export async function removeMenuSectionAction(type: string) {
  if (!isMenuSectionType(type)) {
    return { ok: false as const, error: 'Type de menu invalide.' }
  }

  try {
    const { supabase, entity } = await requireEntity()
    await deactivateEntityMenuSection(supabase, entity.id, type)
    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)
    return { ok: true as const, type }
  } catch (err) {
    console.error('[removeMenuSectionAction]', err)
    return { ok: false as const, error: 'Impossible de masquer cet onglet.' }
  }
}
