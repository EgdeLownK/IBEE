import { type NextRequest } from 'next/server'
import { getAnalyseSession } from '@/lib/analyse-session'
import { DASHBOARD_PRIVATE_CACHE } from '@/lib/api-cache-headers'
import {
  loadAnalyseRankingChartSeries,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
} from '@/lib/analyse-data'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const entityId = searchParams.get('entityId') ?? ''
  const rankingItemId = searchParams.get('rankingItemId') ?? ''

  if (!rankingItemId) {
    return Response.json({ ok: false, error: 'rankingItemId requis.' }, { status: 400 })
  }

  const session = await getAnalyseSession(entityId)
  if (!session) {
    return Response.json({ ok: false, error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const data = await loadAnalyseRankingChartSeries(session.supabase, session.entityId, {
      scope: parseAnalyseScope(searchParams.get('scope') ?? undefined),
      period: parseAnalysePeriod(searchParams.get('period') ?? undefined),
      offset: parseAnalyseOffset(searchParams.get('offset') ?? undefined),
      rankingItemId,
    })

    return Response.json(
      { ok: true, data },
      { headers: { 'Cache-Control': DASHBOARD_PRIVATE_CACHE } },
    )
  } catch (err) {
    console.error('[GET /api/dashboard/analyse/ranking-chart]', err)
    return Response.json(
      { ok: false, error: 'Impossible de charger le graphique.' },
      { status: 500 },
    )
  }
}
