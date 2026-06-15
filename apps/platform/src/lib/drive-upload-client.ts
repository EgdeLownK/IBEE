import { createBrowserClient } from '@/lib/supabase/browser'
import {
  fileExtension,
  shouldUseDirectDriveUpload,
  validateDriveUpload,
} from '@/lib/drive-file-policy'
import { prepareDriveUploadFile } from '@/lib/drive-upload-prep'
import {
  registerDirectEntityFileAction,
  uploadEntityFileAction,
  type EntityFileDto,
} from '@/lib/entity-file-actions'

export type DriveUploadClientResult = {
  ok: true
  file: EntityFileDto
  compressed: boolean
  originalSize: number
  finalSize: number
}

export type DriveUploadClientError = {
  ok: false
  error: string
}

async function directUploadToStorage(file: File): Promise<{
  storagePath: string
  userId: string
}> {
  const supabase = createBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié.')
  }

  const ext = fileExtension(file.name) || 'bin'
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('product-files').upload(storagePath, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error("Erreur lors de l'envoi direct du fichier.")
  }

  return { storagePath, userId: user.id }
}

async function compressEntityFileOnServer(fileId: string): Promise<{
  compressed: boolean
  originalSize: number
  finalSize: number
  file?: EntityFileDto
}> {
  const response = await fetch('/api/entity-files/compress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })

  const payload = (await response.json()) as {
    ok: boolean
    error?: string
    compressed?: boolean
    originalSize?: number
    finalSize?: number
    file?: EntityFileDto
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? 'Compression serveur impossible.')
  }

  return {
    compressed: Boolean(payload.compressed),
    originalSize: payload.originalSize ?? 0,
    finalSize: payload.finalSize ?? 0,
    file: payload.file,
  }
}

export type DriveUploadOptions = {
  entityId?: string
  folderId?: string | null
}

export async function uploadDriveFile(
  file: File,
  onProgress?: (message: string) => void,
  options?: DriveUploadOptions,
): Promise<DriveUploadClientResult | DriveUploadClientError> {
  const validation = validateDriveUpload(file)
  if (!validation.ok) return validation

  const originalSize = file.size

  if (shouldUseDirectDriveUpload(file)) {
    try {
      onProgress?.('Envoi direct vers le stockage…')
      const { storagePath } = await directUploadToStorage(file)

      onProgress?.('Enregistrement…')
      const registered = await registerDirectEntityFileAction({
        storagePath,
        name: file.name,
        mimeType: file.type || 'video/mp4',
        sizeBytes: file.size,
        entityId: options?.entityId,
        folderId: options?.folderId ?? null,
      })

      if (!registered.ok) return registered

      onProgress?.('Compression serveur…')
      try {
        const compressed = await compressEntityFileOnServer(registered.file.id)
        const finalFile = compressed.file ?? registered.file
        return {
          ok: true,
          file: finalFile,
          compressed: compressed.compressed,
          originalSize: compressed.originalSize || originalSize,
          finalSize: compressed.finalSize || finalFile.size_bytes,
        }
      } catch (err) {
        console.error('[uploadDriveFile:server-compress]', err)
        return {
          ok: true,
          file: registered.file,
          compressed: false,
          originalSize,
          finalSize: registered.file.size_bytes,
        }
      }
    } catch (err) {
      console.error('[uploadDriveFile:direct]', err)
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur lors de l'envoi du fichier.",
      }
    }
  }

  onProgress?.('Préparation…')
  const prepared = await prepareDriveUploadFile(file, onProgress)
  const fd = new FormData()
  fd.append('file', prepared.file)
  if (options?.entityId) fd.append('entityId', options.entityId)
  if (options?.folderId) fd.append('folderId', options.folderId)

  onProgress?.('Envoi…')
  const result = await uploadEntityFileAction(fd)
  if (!result.ok) return result

  return {
    ok: true,
    file: result.file,
    compressed: prepared.compressed,
    originalSize: prepared.originalSize,
    finalSize: prepared.finalSize,
  }
}
