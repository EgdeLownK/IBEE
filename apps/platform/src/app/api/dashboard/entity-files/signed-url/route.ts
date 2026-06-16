import { type NextRequest } from 'next/server'
import { PRIVATE_NO_STORE } from '@/lib/api-cache-headers'
import { getOwnedEntityFile, requireOwnerEntity } from '@/lib/entity-file-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('fileId') ?? ''
  if (!fileId) {
    return Response.json({ ok: false, error: 'fileId requis.' }, { status: 400 })
  }

  try {
    const session = await requireOwnerEntity()
    if (!session.ok) {
      return Response.json({ ok: false, error: session.error }, { status: 401 })
    }

    const owned = await getOwnedEntityFile(session, fileId)
    if (!owned) {
      return Response.json({ ok: false, error: 'Fichier introuvable.' }, { status: 404 })
    }

    const { data, error } = await session.supabase.storage
      .from('product-files')
      .createSignedUrl(owned.file.storage_path, 120)

    if (error || !data?.signedUrl) {
      console.error('[GET /api/dashboard/entity-files/signed-url]', error)
      return Response.json(
        { ok: false, error: 'Impossible de générer le lien de téléchargement.' },
        { status: 500 }
      )
    }

    return Response.json(
      {
        ok: true,
        url: data.signedUrl,
        name: owned.file.name,
        mime_type: owned.file.mime_type,
      },
      { headers: { 'Cache-Control': PRIVATE_NO_STORE } }
    )
  } catch (err) {
    console.error('[GET /api/dashboard/entity-files/signed-url]', err)
    return Response.json({ ok: false, error: 'Erreur lors de l’accès au fichier.' }, { status: 500 })
  }
}
