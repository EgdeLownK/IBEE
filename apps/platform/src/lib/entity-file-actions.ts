'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DRIVE_MAX_FILE_BYTES, DRIVE_QUOTA_BYTES, DRIVE_QUOTA_GB, validateDriveUpload } from '@/lib/drive-file-policy'
import { processDriveUploadFile } from '@/lib/drive-upload-process'
import {
  getOwnedEntityFile,
  requireOwnerEntity,
  toEntityFileDto,
} from '@/lib/entity-file-server'
import {
  createEntityFile,
  deleteEntityFileRecord,
  getEntityFolderById,
  isEntityFileLinkedToProduct,
  sumUserDriveBytes,
} from '@ibee/supabase'

export type { EntityFileDto } from '@/lib/entity-file-server'

async function assertDriveQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  additionalBytes: number,
) {
  const used = await sumUserDriveBytes(supabase, userId)
  if (used + additionalBytes > DRIVE_QUOTA_BYTES) {
    return {
      ok: false as const,
      error: `Quota compte atteint (${DRIVE_QUOTA_GB} Go). Libère de l’espace avant un nouvel import.`,
    }
  }
  return { ok: true as const, used }
}

async function resolveFolderId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
  folderId?: string | null,
) {
  if (!folderId) return { ok: true as const, folderId: null as string | null }
  const folder = await getEntityFolderById(supabase, folderId)
  if (!folder || folder.entity_id !== entityId) {
    return { ok: false as const, error: 'Dossier introuvable.' }
  }
  return { ok: true as const, folderId }
}

export async function uploadEntityFileAction(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Aucun fichier fourni.' }
  }

  const entityId = typeof formData.get('entityId') === 'string' ? formData.get('entityId') as string : undefined
  const folderIdRaw = formData.get('folderId')
  const folderId =
    typeof folderIdRaw === 'string' && folderIdRaw.length > 0 ? folderIdRaw : null

  const validation = validateDriveUpload(file)
  if (!validation.ok) return validation

  try {
    const session = await requireOwnerEntity(entityId)
    if (!session.ok) return session

    const folder = await resolveFolderId(session.supabase, session.entity.id, folderId)
    if (!folder.ok) return folder

    const quota = await assertDriveQuota(session.supabase, session.user.id, file.size)
    if (!quota.ok) return quota

    const processed = await processDriveUploadFile(file)
    if (processed.sizeBytes > DRIVE_MAX_FILE_BYTES) {
      return {
        ok: false as const,
        error: 'Le fichier compressé dépasse encore la limite autorisée.',
      }
    }

    const ext =
      (processed.fileName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await session.supabase.storage
      .from('product-files')
      .upload(path, processed.buffer, { contentType: processed.mimeType })

    if (uploadError) {
      console.error('[uploadEntityFileAction]', uploadError)
      return { ok: false as const, error: "Erreur lors de l'envoi du fichier." }
    }

    const created = await createEntityFile(session.supabase, {
      entity_id: session.entity.id,
      name: processed.fileName,
      storage_path: path,
      mime_type: processed.mimeType,
      size_bytes: processed.sizeBytes,
      folder_id: folder.folderId,
    })

    revalidatePath('/dashboard/drive')

    return { ok: true as const, file: toEntityFileDto(created) }
  } catch (err) {
    console.error('[uploadEntityFileAction]', err)
    return { ok: false as const, error: "Erreur lors de l'enregistrement du fichier." }
  }
}

export async function registerDirectEntityFileAction(input: {
  storagePath: string
  name: string
  mimeType: string
  sizeBytes: number
  entityId?: string
  folderId?: string | null
}) {
  if (!input.storagePath || !input.name || input.sizeBytes <= 0) {
    return { ok: false as const, error: 'Métadonnées de fichier invalides.' }
  }

  if (input.sizeBytes > DRIVE_MAX_FILE_BYTES) {
    return {
      ok: false as const,
      error: 'Le fichier dépasse la limite autorisée.',
    }
  }

  try {
    const session = await requireOwnerEntity(input.entityId)
    if (!session.ok) return session

    if (!input.storagePath.startsWith(`${session.user.id}/`)) {
      return { ok: false as const, error: 'Chemin de stockage non autorisé.' }
    }

    const folder = await resolveFolderId(session.supabase, session.entity.id, input.folderId ?? null)
    if (!folder.ok) return folder

    const quota = await assertDriveQuota(session.supabase, session.user.id, input.sizeBytes)
    if (!quota.ok) return quota

    const { data: blob, error: downloadError } = await session.supabase.storage
      .from('product-files')
      .download(input.storagePath)

    if (downloadError || !blob) {
      console.error('[registerDirectEntityFileAction:download]', downloadError)
      return { ok: false as const, error: 'Fichier introuvable dans le stockage.' }
    }

    const created = await createEntityFile(session.supabase, {
      entity_id: session.entity.id,
      name: input.name,
      storage_path: input.storagePath,
      mime_type: input.mimeType || null,
      size_bytes: input.sizeBytes,
      folder_id: folder.folderId,
    })

    revalidatePath('/dashboard/drive')

    return { ok: true as const, file: toEntityFileDto(created) }
  } catch (err) {
    console.error('[registerDirectEntityFileAction]', err)
    return { ok: false as const, error: "Erreur lors de l'enregistrement du fichier." }
  }
}

export async function deleteEntityFileAction(fileId: string) {
  try {
    const session = await requireOwnerEntity()
    if (!session.ok) return session

    const owned = await getOwnedEntityFile(session, fileId)
    if (!owned) return { ok: false as const, error: 'Fichier introuvable.' }

    if (await isEntityFileLinkedToProduct(session.supabase, fileId)) {
      return {
        ok: false as const,
        error: 'Ce fichier est lié à un produit digital. Retire-le du produit avant de le supprimer.',
      }
    }

    const { error: storageError } = await session.supabase.storage
      .from('product-files')
      .remove([owned.file.storage_path])

    if (storageError) {
      console.error('[deleteEntityFileAction:storage]', storageError)
      return { ok: false as const, error: 'Erreur lors de la suppression du fichier.' }
    }

    await deleteEntityFileRecord(session.supabase, fileId)
    revalidatePath('/dashboard/drive')

    return { ok: true as const }
  } catch (err) {
    console.error('[deleteEntityFileAction]', err)
    return { ok: false as const, error: 'Erreur lors de la suppression.' }
  }
}
