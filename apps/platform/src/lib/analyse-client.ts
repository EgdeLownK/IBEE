import type { AnalyseScopePayload } from '@/lib/analyse-data'
import type { AnalyseBarPoint, AnalysePeriod } from '@/lib/analyse-period'

export type FetchAnalyseScopeInput = {
  entityId: string
  scope?: string
  period?: AnalysePeriod | string
  offset?: number
  rankingLimit?: number
}

export type FetchAnalyseScopeResult =
  { ok: true; data: AnalyseScopePayload } | { ok: false; error: string }

export type FetchAnalyseRankingChartResult =
  { ok: true; data: AnalyseBarPoint[] } | { ok: false; error: string }

function buildAnalyseSearchParams(input: FetchAnalyseScopeInput) {
  const params = new URLSearchParams()
  params.set('entityId', input.entityId)
  if (input.scope) params.set('scope', input.scope)
  if (input.period) params.set('period', String(input.period))
  if (input.offset != null) params.set('offset', String(input.offset))
  if (input.rankingLimit != null) params.set('rankingLimit', String(input.rankingLimit))
  return params
}

export async function fetchAnalyseScope(
  input: FetchAnalyseScopeInput,
): Promise<FetchAnalyseScopeResult> {
  const params = buildAnalyseSearchParams(input)
  const res = await fetch(`/api/dashboard/analyse?${params}`)
  if (!res.ok) {
    return { ok: false, error: 'Erreur réseau.' }
  }
  return (await res.json()) as FetchAnalyseScopeResult
}

export async function fetchAnalyseRankingChart(input: {
  entityId: string
  scope?: string
  period?: AnalysePeriod | string
  offset?: number
  rankingItemId: string
}): Promise<FetchAnalyseRankingChartResult> {
  const params = buildAnalyseSearchParams(input)
  params.set('rankingItemId', input.rankingItemId)
  const res = await fetch(`/api/dashboard/analyse/ranking-chart?${params}`)
  if (!res.ok) {
    return { ok: false, error: 'Erreur réseau.' }
  }
  return (await res.json()) as FetchAnalyseRankingChartResult
}
