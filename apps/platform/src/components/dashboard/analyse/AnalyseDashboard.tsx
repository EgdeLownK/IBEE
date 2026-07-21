'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Newspaper,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import {
  fetchAnalyseRankingChart,
  fetchAnalyseScope,
} from '@/lib/analyse-client'
import {
  ANALYSE_PERIODS,
  analyseScopeCacheKey,
  buildAnalyseOffsetWarmupTasks,
  buildAnalyseWarmupTasks,
  hydrateAnalyseCacheMap,
} from '@/lib/analyse-cache'
import {
  ANALYSE_PERIOD_TABS,
  getChartColumnCount,
  getMinPeriodOffset,
  getPeriodWindow,
  normalizeAnalysePeriod,
  type AnalyseBarPoint,
  type AnalysePeriod,
} from '@/lib/analyse-period'
import type { AnalyseScopePayload } from '@/lib/analyse-data'
import { AnalyseExportMenu } from '@/components/dashboard/analyse/AnalyseExportMenu'

type Scope = AnalyseScopePayload['scope']

type ChartSeries = {
  source: 'kpi' | 'ranking'
  id: string
}

type Props = {
  entityId: string
  accountCreatedAt: string
  data: AnalyseScopePayload
  initialRankingLimit?: number
  initialCache?: Record<string, AnalyseScopePayload>
}

const SCOPES: { id: Scope; label: string; Icon: LucideIcon }[] = [
  { id: 'web', label: 'Profil web', Icon: LayoutGrid },
  { id: 'news', label: 'News', Icon: Newspaper },
]

function defaultChartSeries(data: AnalyseScopePayload): ChartSeries {
  const first = data.kpis[0]
  return { source: 'kpi', id: first?.id ?? 'visitors' }
}

function periodCompareLabel(period: AnalysePeriod) {
  return period === 'year' ? 'an dernier' : 'sem. dernière'
}

function rankingEmptyCopy(scope: Scope): { title: string; hint: string } {
  switch (scope) {
    case 'web':
      return {
        title: 'Aucune section consultée',
        hint: 'Shop, Service, Event et les autres onglets apparaîtront ici dès que des visiteurs exploreront votre profil.',
      }
    case 'shop':
      return {
        title: 'Aucun produit consulté',
        hint: 'Les produits les plus vus s\'afficheront ici lorsque des visiteurs parcourront votre boutique.',
      }
    case 'service':
      return {
        title: 'Aucun service consulté',
        hint: 'Les services les plus demandés apparaîtront ici après les premières visites.',
      }
    case 'event':
      return {
        title: 'Aucun événement consulté',
        hint: 'Les événements les plus vus s\'afficheront ici lorsque des visiteurs consulteront votre billetterie.',
      }
    case 'news':
      return {
        title: 'Aucune publication consultée',
        hint: 'Vos news les plus lues apparaîtront ici après les premières consultations.',
      }
    default:
      return {
        title: 'Aucune donnée pour cette période',
        hint: 'Revenez consulter cette vue lorsque de l\'activité sera enregistrée.',
      }
  }
}

function seriesKey(series: ChartSeries) {
  return `${series.source}:${series.id}`
}

function buildAnalyseQuery(input: {
  scope: Scope
  period: AnalysePeriod
  offset: number
  rankingLimit: number
}) {
  const params = new URLSearchParams()
  params.set('scope', input.scope)
  params.set('period', input.period)
  params.set('offset', String(input.offset))
  if (input.rankingLimit !== 4) {
    params.set('rankingLimit', String(input.rankingLimit))
  }
  return params.toString()
}

function syncAnalyseUrl(input: {
  scope: Scope
  period: AnalysePeriod
  offset: number
  rankingLimit: number
}) {
  const qs = buildAnalyseQuery(input)
  window.history.replaceState(null, '', `/dashboard/analyse?${qs}`)
}

export function AnalyseDashboard({
  entityId,
  accountCreatedAt,
  data: initialData,
  initialRankingLimit = 4,
  initialCache,
}: Props) {
  const cacheRef = useRef<Map<string, AnalyseScopePayload> | null>(null)
  if (cacheRef.current === null) {
    cacheRef.current = hydrateAnalyseCacheMap(initialCache, initialData, initialRankingLimit)
  }

  const [data, setData] = useState(initialData)
  const [rankingLimit, setRankingLimit] = useState(initialRankingLimit)
  const [error, setError] = useState<string | null>(null)
  const [extraCharts, setExtraCharts] = useState<Record<string, AnalyseBarPoint[]>>({})
  const inflightRef = useRef(
    new Map<string, ReturnType<typeof fetchAnalyseScope>>()
  )
  const loadGenerationRef = useRef(0)
  const warmupStartedRef = useRef(false)
  const [chartSeries, setChartSeries] = useState<ChartSeries>(() =>
    defaultChartSeries(initialData)
  )
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  const scope = data.scope
  const period = normalizeAnalysePeriod(data.period)
  const periodOffset = data.offset

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('period') !== 'month') return
    params.set('period', 'week')
    const qs = params.toString()
    window.history.replaceState(null, '', `/dashboard/analyse?${qs}`)
  }, [])

  const applyScopePayload = useCallback(
    (cached: AnalyseScopePayload, nextRankingLimit?: number) => {
      setData(cached)
      setChartSeries(defaultChartSeries(cached))
      setSelectedBar(null)
      setExtraCharts({})
      if (nextRankingLimit != null) {
        setRankingLimit(nextRankingLimit)
      }
    },
    []
  )

  const fetchScope = useCallback(
    (payload: {
      scope: Scope
      period: AnalysePeriod
      offset: number
      rankingLimit: number
    }) => {
      const cache = cacheRef.current!
      const key = analyseScopeCacheKey(payload)
      const cached = cache.get(key)
      if (cached) {
        return Promise.resolve({ ok: true as const, data: cached })
      }

      const inflight = inflightRef.current.get(key)
      if (inflight) return inflight

      const promise = fetchAnalyseScope({ entityId, ...payload }).then((result) => {
        inflightRef.current.delete(key)
        if (result.ok) cache.set(key, result.data)
        return result
      })
      inflightRef.current.set(key, promise)
      return promise
    },
    [entityId]
  )

  useEffect(() => {
    if (warmupStartedRef.current) return
    warmupStartedRef.current = true

    const tasks = buildAnalyseWarmupTasks(accountCreatedAt, {
      scope: initialData.scope,
      period: normalizeAnalysePeriod(initialData.period),
      rankingLimit: initialRankingLimit,
    })

    const cache = cacheRef.current!
    let cancelled = false
    let index = 0
    const concurrency = 4

    async function worker() {
      while (!cancelled) {
        const taskIndex = index
        index += 1
        const task = tasks[taskIndex]
        if (!task) return
        const key = analyseScopeCacheKey(task)
        if (cache.has(key)) continue
        await fetchScope(task)
      }
    }

    void Promise.all(
      Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
    )

    return () => {
      cancelled = true
    }
  }, [accountCreatedAt, fetchScope, initialData.period, initialData.scope, initialRankingLimit])

  const minOffset = useMemo(
    () => getMinPeriodOffset(period, accountCreatedAt),
    [period, accountCreatedAt]
  )

  const activeSeriesKey = seriesKey(chartSeries)
  const chartBars =
    data.chartSeries[activeSeriesKey] ??
    extraCharts[activeSeriesKey] ??
    data.chartSeries[`kpi:${data.kpis[0]?.id}`] ??
    []
  const activeLabel =
    chartSeries.source === 'kpi'
      ? data.kpis.find((k) => k.id === chartSeries.id)?.k ?? data.metric
      : data.ranking.items.find((r) => r.id === chartSeries.id)?.k ?? data.metric

  const maxBar = useMemo(() => Math.max(...chartBars.map((b) => b.value), 1), [chartBars])
  const columnCount = useMemo(() => {
    const window = getPeriodWindow(period, periodOffset)
    return getChartColumnCount(period, window)
  }, [period, periodOffset])

  const canGoBack = periodOffset > minOffset
  const canGoForward = periodOffset < 0

  function loadScope(next: {
    scope?: Scope
    period?: AnalysePeriod
    offset?: number
    rankingLimit?: number
  }) {
    const payload = {
      scope: next.scope ?? scope,
      period: next.period ?? period,
      offset: next.offset ?? periodOffset,
      rankingLimit: next.rankingLimit ?? rankingLimit,
    }

    setError(null)
    syncAnalyseUrl(payload)

    const cached = cacheRef.current!.get(analyseScopeCacheKey(payload))
    if (cached) {
      applyScopePayload(cached, next.rankingLimit ?? undefined)
      return
    }

    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation

    void fetchScope(payload).then((result) => {
      if (loadGenerationRef.current !== generation) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      setData(result.data)
      setChartSeries(defaultChartSeries(result.data))
      setSelectedBar(null)
      setExtraCharts({})
      if (next.rankingLimit != null) {
        setRankingLimit(next.rankingLimit)
      }
    })
  }

  function prefetchScope(targetScope: Scope) {
    void fetchScope({
      scope: targetScope,
      period,
      offset: targetScope === scope ? periodOffset : 0,
      rankingLimit: targetScope === scope ? rankingLimit : 4,
    })

    if (targetScope !== scope) {
      const otherPeriod = ANALYSE_PERIODS.find((p) => p !== period)
      if (otherPeriod) {
        void fetchScope({
          scope: targetScope,
          period: otherPeriod,
          offset: 0,
          rankingLimit: 4,
        })
      }
    }
  }

  function prefetchPeriod(targetPeriod: AnalysePeriod) {
    void fetchScope({
      scope,
      period: targetPeriod,
      offset: periodOffset,
      rankingLimit,
    })
  }

  function prefetchOffset(delta: number) {
    const nextOffset = periodOffset + delta
    if (nextOffset < minOffset || nextOffset > 0) return
    void fetchScope({
      scope,
      period,
      offset: nextOffset,
      rankingLimit,
    })
  }

  function warmupOffsetRange(payload: {
    scope: Scope
    period: AnalysePeriod
    rankingLimit: number
  }) {
    const tasks = buildAnalyseOffsetWarmupTasks(accountCreatedAt, payload)
    const cache = cacheRef.current!
    for (const task of tasks) {
      if (cache.has(analyseScopeCacheKey(task))) continue
      void fetchScope(task)
    }
  }

  function handleScopeChange(next: Scope) {
    setSelectedBar(null)
    loadScope({ scope: next, offset: 0, rankingLimit: 4 })
    warmupOffsetRange({ scope: next, period, rankingLimit: 4 })
  }

  function handlePeriodChange(next: AnalysePeriod) {
    setSelectedBar(null)
    loadScope({ period: next, offset: 0 })
    warmupOffsetRange({ scope, period: next, rankingLimit })
  }

  function selectKpi(id: string) {
    setChartSeries({ source: 'kpi', id })
    setSelectedBar(null)
  }

  function selectRanking(id: string) {
    setChartSeries({ source: 'ranking', id })
    setSelectedBar(null)

    const key = `ranking:${id}`
    if (data.chartSeries[key] || extraCharts[key]) return

    void fetchAnalyseRankingChart({
      entityId,
      scope,
      period,
      offset: periodOffset,
      rankingItemId: id,
    }).then((result) => {
      if (!result.ok) return
      setExtraCharts((prev) => ({ ...prev, [key]: result.data }))
    })
  }

  function handleShowMore() {
    const nextLimit = Math.min(20, rankingLimit + 6)
    loadScope({ rankingLimit: nextLimit })
  }

  const rankingEmpty = rankingEmptyCopy(scope)

  return (
    <main className="analyse-page">
      <div className="anal-head">
        <h1 className="anal-head__title">Analyse globale</h1>
        <AnalyseExportMenu
          accountCreatedAt={accountCreatedAt}
          defaultPeriod={period}
          defaultOffset={periodOffset}
        />
      </div>

      {error ? <p className="anal-head__error">{error}</p> : null}

      <div className="anal-scope" role="tablist" aria-label="Périmètre">
        {SCOPES.map((s) => {
          const Icon = s.Icon
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={scope === s.id}
              className={`anal-scope__tab${scope === s.id ? ' is-on' : ''}`}
              onMouseEnter={() => prefetchScope(s.id)}
              onFocus={() => prefetchScope(s.id)}
              onClick={() => handleScopeChange(s.id)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      <div className="anal-content">
          <div className="anal-kpis" role="listbox" aria-label="Indicateurs">
            {data.kpis.map((kpi) => {
              const isOn = chartSeries.source === 'kpi' && chartSeries.id === kpi.id
              return (
                <button
                  key={kpi.id}
                  type="button"
                  role="option"
                  aria-selected={isOn}
                  className={`anal-kpi${isOn ? ' is-on' : ''}`}
                  onClick={() => selectKpi(kpi.id)}
                >
                  <div className="anal-kpi__label">{kpi.k}</div>
                  <div className="anal-kpi__value">{kpi.v}</div>
                  <div className={`anal-kpi__delta${kpi.up ? ' is-up' : ' is-down'}`}>
                    {kpi.d}
                    <span className="anal-kpi__compare">vs. {periodCompareLabel(period)}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="anal-chart">
            <div className="anal-chart__top">
              <p className="anal-chart__metric">{activeLabel}</p>
              <div className="anal-period" role="tablist" aria-label="Période">
                {ANALYSE_PERIOD_TABS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    data-period={p.id}
                    aria-selected={period === p.id}
                    className={`anal-period__btn${period === p.id ? ' is-on' : ''}`}
                    onMouseEnter={() => prefetchPeriod(p.id)}
                    onFocus={() => prefetchPeriod(p.id)}
                    onClick={() => handlePeriodChange(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="anal-chart__nav">
              <button
                type="button"
                className="anal-chart__nav-btn"
                aria-label="Période précédente"
                disabled={!canGoBack}
                onMouseEnter={() => prefetchOffset(-1)}
                onFocus={() => prefetchOffset(-1)}
                onClick={() => {
                  setSelectedBar(null)
                  loadScope({ offset: periodOffset - 1 })
                }}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="anal-chart__range">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{data.rangeLabel}</span>
              </div>
              <button
                type="button"
                className="anal-chart__nav-btn"
                aria-label="Période suivante"
                disabled={!canGoForward}
                onMouseEnter={() => prefetchOffset(1)}
                onFocus={() => prefetchOffset(1)}
                onClick={() => {
                  setSelectedBar(null)
                  loadScope({ offset: periodOffset + 1 })
                }}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div
              className={`anal-chart__bars${period === 'year' ? ' anal-chart__bars--year' : ''}`}
              style={{ gridTemplateColumns: `repeat(${chartBars.length || columnCount}, 1fr)` }}
              role="group"
              aria-label={`Graphique ${activeLabel} — ${data.rangeLabel}`}
            >
              {chartBars.map((bar, i) => {
                const height = Math.round((bar.value / maxBar) * 100)
                const isOn = selectedBar === i
                return (
                  <button
                    key={`${bar.label}-${i}`}
                    type="button"
                    className={`anal-bar${isOn ? ' is-on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => setSelectedBar(selectedBar === i ? null : i)}
                  >
                    <span className="anal-bar__value">{bar.value.toLocaleString('fr-FR')}</span>
                    <span className="anal-bar__track">
                      <span className="anal-bar__fill" style={{ height: `${height}%` }} />
                    </span>
                    <span className="anal-bar__day">{bar.label}</span>
                  </button>
                )
              })}
            </div>

            <p className="anal-chart__hint">Vous pouvez sélectionner une barre du graphique.</p>

            {data.stats ? (
              <div className="anal-chart__stats">
                {data.stats.map((stat) => (
                  <div key={stat.l} className="anal-stat">
                    <div className="anal-stat__label">{stat.l}</div>
                    <div className="anal-stat__value">{stat.v}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="anal-bottom">
            <div className="anal-card">
              <div className="anal-card__head">
                <div className="anal-card__title">{data.ranking.title}</div>
              </div>
              {data.ranking.items.length === 0 ? (
                <div className="anal-ranking-empty">
                  <span className="anal-ranking-empty__icon" aria-hidden="true">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <p className="anal-ranking-empty__title">{rankingEmpty.title}</p>
                  <p className="anal-ranking-empty__hint">{rankingEmpty.hint}</p>
                </div>
              ) : (
                <div className="anal-top" role="listbox" aria-label={data.ranking.title}>
                  {data.ranking.items.map((item, i) => {
                    const isOn = chartSeries.source === 'ranking' && chartSeries.id === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isOn}
                        className={`anal-top__row${isOn ? ' is-on' : ''}`}
                        onClick={() => selectRanking(item.id)}
                      >
                        <span className="anal-top__rank">{i + 1}</span>
                        <div className="anal-top__col">
                          <div className="anal-top__name">{item.k}</div>
                          <div className="anal-top__bar">
                            <div className="anal-top__fill" style={{ width: item.v }} />
                          </div>
                        </div>
                        <div className="anal-top__nums">
                          <div className="anal-top__pct">{item.v}</div>
                          <div className="anal-top__count">{item.n}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {data.ranking.hasMore ? (
                <button type="button" className="anal-card__more" onClick={handleShowMore}>
                  Afficher plus
                </button>
              ) : null}
            </div>
          </div>
      </div>
    </main>
  )
}
