'use server'

import { getAnalyseSession } from '@/lib/analyse-session'
import { measureDashboardLoad } from '@/lib/dashboard-perf'
import {
  loadAnalyseRankingChartSeries,
  loadAnalyseScopeData,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
  type AnalyseScopePayload,
} from '@/lib/analyse-data'

export type FetchAnalyseScopeInput = {
  entityId: string
  scope?: string
  period?: string
  offset?: number
  rankingLimit?: number
}

export type FetchAnalyseScopeResult =
  | { ok: true; data: AnalyseScopePayload }
  | { ok: false; error: string }

export type FetchAnalyseRankingChartResult =
  | { ok: true; data: AnalyseScopePayload['chartSeries'][string] }
  | { ok: false; error: string }

export async function fetchAnalyseRankingChartAction(input: {
  entityId: string
  scope?: string
  period?: string
  offset?: number
  rankingItemId: string
}): Promise<FetchAnalyseRankingChartResult> {
  const session = await getAnalyseSession(input.entityId)
  if (!session) {
    return { ok: false, error: 'Non authentifié.' }
  }

  try {
    const data = await loadAnalyseRankingChartSeries(session.supabase, session.entityId, {
      scope: parseAnalyseScope(input.scope),
      period: parseAnalysePeriod(input.period),
      offset: parseAnalyseOffset(
        input.offset != null ? String(input.offset) : undefined
      ),
      rankingItemId: input.rankingItemId,
    })
    return { ok: true, data }
  } catch (err) {
    console.error('[fetchAnalyseRankingChartAction]', err)
    return { ok: false, error: 'Impossible de charger le graphique.' }
  }
}

export async function fetchAnalyseScopeAction(
  input: FetchAnalyseScopeInput
): Promise<FetchAnalyseScopeResult> {
  const session = await getAnalyseSession(input.entityId)
  if (!session) {
    return { ok: false, error: 'Non authentifié.' }
  }

  const rankingLimit = Math.min(
    20,
    Math.max(4, Number(input.rankingLimit ?? 4) || 4)
  )

  try {
    const data = await measureDashboardLoad(
      'action:analyse',
      () =>
        loadAnalyseScopeData(session.supabase, session.entityId, {
          scope: parseAnalyseScope(input.scope),
          period: parseAnalysePeriod(input.period),
          offset: parseAnalyseOffset(
            input.offset != null ? String(input.offset) : undefined
          ),
          rankingLimit,
        }),
      {
        scope: parseAnalyseScope(input.scope),
        period: parseAnalysePeriod(input.period),
      }
    )
    return { ok: true, data }
  } catch (err) {
    console.error('[fetchAnalyseScopeAction]', err)
    return { ok: false, error: 'Impossible de charger les données.' }
  }
}
