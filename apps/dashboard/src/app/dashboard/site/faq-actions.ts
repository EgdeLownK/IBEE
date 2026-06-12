'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import { getEntityByUserId, purgeEntityCache, upsertEntityFaq } from '@ibee/supabase'
import { validateFaqItems } from '@ibee/ui-server'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

export async function saveFaqItemsAction(items: unknown) {
  const validated = validateFaqItems(items)
  if (validated === null) {
    return { ok: false as const, error: 'Questions invalides (max 10, champs requis).' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    await upsertEntityFaq(supabase, entity.id, validated)
    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return { ok: true as const, items: validated }
  } catch (err) {
    console.error('[saveFaqItemsAction]', err)
    return { ok: false as const, error: 'Enregistrement impossible.' }
  }
}
