import { type NextRequest } from 'next/server'
import { getAnalyseSession } from '@/lib/analyse-session'
import { DASHBOARD_PRIVATE_CACHE } from '@/lib/api-cache-headers'
import { measureDashboardLoad } from '@/lib/dashboard-perf'
import {
  loadAnalyseScopeData,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
} from '@/lib/analyse-data'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const entityId = searchParams.get('entityId') ?? ''
  const rankingLimit = Math.min(20, Math.max(4, Number(searchParams.get('rankingLimit') ?? 4) || 4))

  const session = await getAnalyseSession(entityId)
  if (!session) {
    return Response.json({ ok: false, error: 'Non authentifié.' }, { status: 401 })
  }

  const scope = parseAnalyseScope(searchParams.get('scope') ?? undefined)
  const period = parseAnalysePeriod(searchParams.get('period') ?? undefined)

  try {
    const data = await measureDashboardLoad(
      'api:analyse',
      () =>
        loadAnalyseScopeData(session.supabase, session.entityId, {
          scope,
          period,
          offset: parseAnalyseOffset(searchParams.get('offset') ?? undefined),
          rankingLimit,
        }),
      { scope, period },
    )

    return Response.json(
      { ok: true, data },
      { headers: { 'Cache-Control': DASHBOARD_PRIVATE_CACHE } },
    )
  } catch (err) {
    console.error('[GET /api/dashboard/analyse]', err)
    return Response.json(
      { ok: false, error: 'Impossible de charger les données.' },
      { status: 500 },
    )
  }
}
