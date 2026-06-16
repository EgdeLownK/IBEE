import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  getEntityFileById,
  getEntityOwnedByUser,
  listEntityFiles,
} from '@ibee/supabase'

export type EntityFileDto = {
  id: string
  name: string
  mime_type: string | null
  size_bytes: number
  created_at: string
  folder_id: string | null
}

type OwnerSession =
  | { ok: false; error: string }
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      user: { id: string }
      entity: { id: string }
    }

export async function requireOwnerEntity(entityId?: string): Promise<OwnerSession> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié.' }

  const entity = entityId
    ? await getEntityOwnedByUser(supabase, entityId, user.id)
    : await getEntityByUserId(supabase, user.id)
  if (!entity) return { ok: false, error: 'Profil introuvable.' }

  return { ok: true, supabase, user, entity }
}

export async function getOwnedEntityFile(
  session: Extract<OwnerSession, { ok: true }>,
  fileId: string
) {
  const file = await getEntityFileById(session.supabase, fileId)
  if (!file) return null

  const entity = await getEntityOwnedByUser(session.supabase, file.entity_id, session.user.id)
  if (!entity) return null

  return { file, entity }
}

export function toEntityFileDto(file: {
  id: string
  name: string
  mime_type: string | null
  size_bytes: number
  created_at: string
  folder_id?: string | null
}): EntityFileDto {
  return {
    id: file.id,
    name: file.name,
    mime_type: file.mime_type,
    size_bytes: file.size_bytes,
    created_at: file.created_at,
    folder_id: file.folder_id ?? null,
  }
}

export async function listOwnedEntityFiles(session: Extract<OwnerSession, { ok: true }>) {
  const files = await listEntityFiles(session.supabase, session.entity.id)
  return files.map(toEntityFileDto)
}
