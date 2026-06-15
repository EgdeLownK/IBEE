import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { compressDriveVideoFromUrl } from '@/lib/drive-video-compress-server'
import { DRIVE_MAX_FILE_BYTES, getDrivePreviewKind } from '@/lib/drive-file-policy'
import { getEntityByUserId, getEntityFileById, updateEntityFile } from '@ibee/supabase'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 })
  }

  const fileId = typeof body.file_id === 'string' ? body.file_id.trim() : ''
  if (!fileId) {
    return NextResponse.json({ ok: false, error: 'Identifiant fichier manquant.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 })
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) {
    return NextResponse.json({ ok: false, error: 'Profil introuvable.' }, { status: 404 })
  }

  const file = await getEntityFileById(supabase, fileId)
  if (!file || file.entity_id !== entity.id) {
    return NextResponse.json({ ok: false, error: 'Fichier introuvable.' }, { status: 404 })
  }

  if (getDrivePreviewKind(file.mime_type, file.name) !== 'video') {
    return NextResponse.json({ ok: false, error: 'Seules les vidéos peuvent être compressées.' }, { status: 400 })
  }

  if (!file.storage_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ ok: false, error: 'Chemin de stockage invalide.' }, { status: 403 })
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from('product-files')
    .createSignedUrl(file.storage_path, 3600)

  if (signedError || !signed?.signedUrl) {
    console.error('[entity-files/compress:signedUrl]', signedError)
    return NextResponse.json({ ok: false, error: 'Impossible de lire le fichier source.' }, { status: 500 })
  }

  const result = await compressDriveVideoFromUrl(signed.signedUrl, file.name, file.size_bytes)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  if (!result.compressed) {
    return NextResponse.json({
      ok: true,
      compressed: false,
      originalSize: result.originalSize,
      finalSize: result.finalSize,
      file: {
        id: file.id,
        name: file.name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        created_at: file.created_at,
      },
    })
  }

  if (result.finalSize > DRIVE_MAX_FILE_BYTES) {
    return NextResponse.json({
      ok: false,
      error: 'La vidéo compressée dépasse encore la limite autorisée.',
    }, { status: 400 })
  }

  const newPath = `${user.id}/${crypto.randomUUID()}.mp4`
  const { error: uploadError } = await supabase.storage
    .from('product-files')
    .upload(newPath, result.buffer, { contentType: result.mimeType })

  if (uploadError) {
    console.error('[entity-files/compress:upload]', uploadError)
    return NextResponse.json({ ok: false, error: 'Erreur lors de l’enregistrement compressé.' }, { status: 500 })
  }

  const { error: removeError } = await supabase.storage.from('product-files').remove([file.storage_path])
  if (removeError) {
    console.error('[entity-files/compress:remove-old]', removeError)
  }

  const updated = await updateEntityFile(supabase, file.id, {
    name: result.fileName,
    storage_path: newPath,
    mime_type: result.mimeType,
    size_bytes: result.finalSize,
  })

  revalidatePath('/dashboard/drive')

  return NextResponse.json({
    ok: true,
    compressed: true,
    originalSize: result.originalSize,
    finalSize: result.finalSize,
    file: {
      id: updated.id,
      name: updated.name,
      mime_type: updated.mime_type,
      size_bytes: updated.size_bytes,
      created_at: updated.created_at,
    },
  })
}
