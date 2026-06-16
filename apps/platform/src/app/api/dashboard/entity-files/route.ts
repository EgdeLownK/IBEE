import { DASHBOARD_PRIVATE_CACHE } from '@/lib/api-cache-headers'
import { listOwnedEntityFiles, requireOwnerEntity } from '@/lib/entity-file-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await requireOwnerEntity()
    if (!session.ok) {
      return Response.json({ ok: false, error: session.error }, { status: 401 })
    }

    const files = await listOwnedEntityFiles(session)
    return Response.json(
      { ok: true, files },
      { headers: { 'Cache-Control': DASHBOARD_PRIVATE_CACHE } }
    )
  } catch (err) {
    console.error('[GET /api/dashboard/entity-files]', err)
    return Response.json(
      { ok: false, error: 'Erreur lors du chargement des fichiers.' },
      { status: 500 }
    )
  }
}
