'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  countEntityFolderChildren,
  createEntityFolder,
  deleteEntityFolder,
  getEntityFolderById,
  getEntityOwnedByUser,
} from '@ibee/supabase'

async function requireOwnedEntity(entityId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non authentifié.' }

  const entity = await getEntityOwnedByUser(supabase, entityId, user.id)
  if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

  return { ok: true as const, supabase, user, entity }
}

function normalizeFolderName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 120) return null
  return trimmed
}

export async function createDriveFolderAction(input: {
  entityId: string
  name: string
  parentId?: string | null
}) {
  const name = normalizeFolderName(input.name)
  if (!name) {
    return { ok: false as const, error: 'Nom de dossier invalide.' }
  }

  try {
    const session = await requireOwnedEntity(input.entityId)
    if (!session.ok) return session

    if (input.parentId) {
      const parent = await getEntityFolderById(session.supabase, input.parentId)
      if (!parent || parent.entity_id !== session.entity.id) {
        return { ok: false as const, error: 'Dossier parent introuvable.' }
      }
    }

    const folder = await createEntityFolder(session.supabase, {
      entity_id: session.entity.id,
      name,
      parent_id: input.parentId ?? null,
    })

    revalidatePath('/dashboard/drive')
    return {
      ok: true as const,
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
      },
    }
  } catch (err) {
    console.error('[createDriveFolderAction]', err)
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : null
    if (code === '23505') {
      return { ok: false as const, error: 'Un dossier porte déjà ce nom à cet emplacement.' }
    }
    return { ok: false as const, error: 'Impossible de créer le dossier.' }
  }
}

export async function deleteDriveFolderAction(folderId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const folder = await getEntityFolderById(supabase, folderId)
    if (!folder) return { ok: false as const, error: 'Dossier introuvable.' }

    const entity = await getEntityOwnedByUser(supabase, folder.entity_id, user.id)
    if (!entity) return { ok: false as const, error: 'Dossier introuvable.' }

    const children = await countEntityFolderChildren(supabase, folderId)
    if (children.subfolders > 0 || children.files > 0) {
      return {
        ok: false as const,
        error: 'Le dossier doit être vide avant suppression.',
      }
    }

    await deleteEntityFolder(supabase, folderId)
    revalidatePath('/dashboard/drive')
    return { ok: true as const }
  } catch (err) {
    console.error('[deleteDriveFolderAction]', err)
    return { ok: false as const, error: 'Impossible de supprimer le dossier.' }
  }
}
