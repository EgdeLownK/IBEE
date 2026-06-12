'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import { getEntityByUserId, purgeEntityCache, upsertEntityHistory } from '@ibee/supabase'
import type { HistoryBlock } from '@ibee/supabase'
import { HISTORY_MAX_BLOCKS, parseHistoryBlocks } from '@ibee/ui-server'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function validateBlocks(raw: unknown): HistoryBlock[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > HISTORY_MAX_BLOCKS) return null
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    if (row.type === 'text') {
      const content = typeof row.content === 'string' ? row.content : ''
      if (content.length > 2000) return null
    } else if (row.type === 'image') {
      const images = Array.isArray(row.images) ? row.images : []
      const legacyUrl = typeof row.url === 'string' ? row.url.trim() : ''
      const hasImages = images.some((img) => {
        if (!img || typeof img !== 'object' || Array.isArray(img)) return false
        const entry = img as Record<string, unknown>
        return typeof entry.url === 'string' && !!entry.url.trim()
      })
      if (!hasImages && !legacyUrl) return null
    } else {
      return null
    }
  }
  return parseHistoryBlocks(raw)
}

export async function uploadHistoryImageAction(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Aucun fichier fourni.' }
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return { ok: false as const, error: 'Format non supporté (jpeg, png, webp, gif, avif).' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false as const, error: 'L\'image ne doit pas dépasser 10 Mo.' }
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
    const path = `${user.id}/${crypto.randomUUID()}/image.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('publication-media')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      console.error('[uploadHistoryImageAction]', uploadError)
      return { ok: false as const, error: 'Erreur lors de l\'envoi du fichier.' }
    }

    const { data } = supabase.storage.from('publication-media').getPublicUrl(path)
    return { ok: true as const, url: data.publicUrl }
  } catch (err) {
    console.error('[uploadHistoryImageAction]', err)
    return { ok: false as const, error: 'Erreur lors de l\'envoi du fichier.' }
  }
}

export async function saveHistoryBlocksAction(blocks: unknown) {
  const validated = validateBlocks(blocks)
  if (validated === null) {
    return { ok: false as const, error: 'Blocs invalides (max 20, formats requis).' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    await upsertEntityHistory(supabase, entity.id, validated)
    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return { ok: true as const, blocks: validated }
  } catch (err) {
    console.error('[saveHistoryBlocksAction]', err)
    return { ok: false as const, error: 'Enregistrement impossible.' }
  }
}
