import type { AnalyseScope, AnalyseScopePayload } from '@/lib/analyse-data'
import { getMinPeriodOffset, type AnalysePeriod } from '@/lib/analyse-period'

export const ANALYSE_SCOPES: AnalyseScope[] = ['web', 'service', 'shop', 'event', 'news']
export const ANALYSE_PERIODS: AnalysePeriod[] = ['week', 'year']
export const ANALYSE_DEFAULT_RANKING_LIMIT = 4
export const MAX_ANALYSE_OFFSET_PREFETCH = 12

export function analyseScopeCacheKey(input: {
  scope: AnalyseScope
  period: AnalysePeriod
  offset: number
  rankingLimit: number
}) {
  return `${input.scope}|${input.period}|${input.offset}|${input.rankingLimit}`
}

export function hydrateAnalyseCacheMap(
  initialCache: Record<string, AnalyseScopePayload> | undefined,
  initialData: AnalyseScopePayload,
  initialRankingLimit: number,
) {
  const map = new Map<string, AnalyseScopePayload>()

  if (initialCache) {
    for (const [key, value] of Object.entries(initialCache)) {
      map.set(key, value)
    }
  }

  map.set(
    analyseScopeCacheKey({
      scope: initialData.scope,
      period: initialData.period,
      offset: initialData.offset,
      rankingLimit: initialRankingLimit,
    }),
    initialData,
  )

  return map
}

function offsetPrefetchRange(minOffset: number) {
  const start = Math.max(minOffset, -MAX_ANALYSE_OFFSET_PREFETCH)
  const offsets: number[] = []
  for (let offset = start; offset <= 0; offset += 1) {
    offsets.push(offset)
  }
  return offsets
}

export type AnalyseWarmupTask = {
  scope: AnalyseScope
  period: AnalysePeriod
  offset: number
  rankingLimit: number
}

/** Tâches de préchauffage client : surface (10) + offsets du focus courant. */
export function buildAnalyseWarmupTasks(
  accountCreatedAt: string,
  focal: {
    scope: AnalyseScope
    period: AnalysePeriod
    rankingLimit: number
  },
): AnalyseWarmupTask[] {
  const tasks: AnalyseWarmupTask[] = []
  const seen = new Set<string>()

  const add = (
    scope: AnalyseScope,
    period: AnalysePeriod,
    offset: number,
    rankingLimit: number,
  ) => {
    const key = analyseScopeCacheKey({ scope, period, offset, rankingLimit })
    if (seen.has(key)) return
    seen.add(key)
    tasks.push({ scope, period, offset, rankingLimit })
  }

  for (const scope of ANALYSE_SCOPES) {
    for (const period of ANALYSE_PERIODS) {
      add(scope, period, 0, ANALYSE_DEFAULT_RANKING_LIMIT)
    }
  }

  const minOffset = getMinPeriodOffset(focal.period, accountCreatedAt)
  for (const offset of offsetPrefetchRange(minOffset)) {
    add(focal.scope, focal.period, offset, focal.rankingLimit)
  }

  return tasks
}

/** Offsets historiques pour un scope × période (navigation ←/→). */
export function buildAnalyseOffsetWarmupTasks(
  accountCreatedAt: string,
  focal: {
    scope: AnalyseScope
    period: AnalysePeriod
    rankingLimit: number
  },
): AnalyseWarmupTask[] {
  const minOffset = getMinPeriodOffset(focal.period, accountCreatedAt)
  return offsetPrefetchRange(minOffset).map((offset) => ({
    scope: focal.scope,
    period: focal.period,
    offset,
    rankingLimit: focal.rankingLimit,
  }))
}
