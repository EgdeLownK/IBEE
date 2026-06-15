'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Newspaper,
  ShoppingBag,
  Upload,
} from 'lucide-react'
import {
  fetchAnalyseRankingChartAction,
  fetchAnalyseScopeAction,
} from '@/app/dashboard/analyse/analyse-actions'
import {
  getChartColumnCount,
  getMinPeriodOffset,
  getPeriodWindow,
  type AnalyseBarPoint,
  type AnalysePeriod,
} from '@/lib/analyse-period'
import type { AnalyseScopePayload } from '@/lib/analyse-data'
import { AnalyseContentSkeleton } from '@/components/dashboard/analyse/AnalyseContentSkeleton'

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
}

const SCOPES: { id: Scope; label: string; Icon: LucideIcon }[] = [
  { id: 'web', label: 'Profil web', Icon: LayoutGrid },
  { id: 'service', label: 'Service', Icon: Briefcase },
  { id: 'shop', label: 'Shop', Icon: ShoppingBag },
  { id: 'event', label: 'Event', Icon: CalendarDays },
  { id: 'news', label: 'News', Icon: Newspaper },
]

const PERIODS: { id: AnalysePeriod; label: string }[] = [
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'year', label: 'Année' },
]

function defaultChartSeries(data: AnalyseScopePayload): ChartSeries {
  const first = data.kpis[0]
  return { source: 'kpi', id: first?.id ?? 'visitors' }
}

function periodCompareLabel(period: AnalysePeriod) {
  if (period === 'week') return 'sem. dernière'
  if (period === 'month') return 'mois dernier'
  return 'an dernier'
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

function scopeCacheKey(input: {
  scope: Scope
  period: AnalysePeriod
  offset: number
  rankingLimit: number
}) {
  return `${input.scope}|${input.period}|${input.offset}|${input.rankingLimit}`
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
}: Props) {
  const [data, setData] = useState(initialData)
  const [rankingLimit, setRankingLimit] = useState(initialRankingLimit)
  const [error, setError] = useState<string | null>(null)
  const [scopeLoading, setScopeLoading] = useState(false)
  const [rankingChartPending, setRankingChartPending] = useState(false)
  const [extraCharts, setExtraCharts] = useState<Record<string, AnalyseBarPoint[]>>({})
  const cacheRef = useRef(new Map<string, AnalyseScopePayload>())
  const inflightRef = useRef(
    new Map<string, ReturnType<typeof fetchAnalyseScopeAction>>()
  )
  const [chartSeries, setChartSeries] = useState<ChartSeries>(() =>
    defaultChartSeries(initialData)
  )
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  useEffect(() => {
    cacheRef.current.set(
      scopeCacheKey({
        scope: initialData.scope,
        period: initialData.period,
        offset: initialData.offset,
        rankingLimit: initialRankingLimit,
      }),
      initialData
    )
  }, [initialData, initialRankingLimit])

  const scope = data.scope
  const period = data.period
  const periodOffset = data.offset

  const fetchScope = useCallback(
    (payload: {
      scope: Scope
      period: AnalysePeriod
      offset: number
      rankingLimit: number
    }) => {
      const key = scopeCacheKey(payload)
      const cached = cacheRef.current.get(key)
      if (cached) {
        return Promise.resolve({ ok: true as const, data: cached })
      }

      const inflight = inflightRef.current.get(key)
      if (inflight) return inflight

      const promise = fetchAnalyseScopeAction({ entityId, ...payload }).then((result) => {
        inflightRef.current.delete(key)
        if (result.ok) cacheRef.current.set(key, result.data)
        return result
      })
      inflightRef.current.set(key, promise)
      return promise
    },
    [entityId]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const tab of SCOPES) {
        if (tab.id === initialData.scope) continue
        void fetchScope({
          scope: tab.id,
          period: initialData.period,
          offset: 0,
          rankingLimit: 4,
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [entityId, fetchScope, initialData.period, initialData.scope])

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

  useEffect(() => {
    if (scopeLoading) return
    setChartSeries(defaultChartSeries(data))
    setSelectedBar(null)
  }, [data.scope, data.period, data.offset, scopeLoading])

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

    const cached = cacheRef.current.get(scopeCacheKey(payload))
    if (cached) {
      setData(cached)
      setExtraCharts({})
      if (next.rankingLimit != null) {
        setRankingLimit(next.rankingLimit)
      }
      return
    }

    setScopeLoading(true)
    void fetchScope(payload)
      .then((result) => {
        if (!result.ok) {
          setError(result.error)
          return
        }
        setData(result.data)
        setExtraCharts({})
        if (next.rankingLimit != null) {
          setRankingLimit(next.rankingLimit)
        }
      })
      .finally(() => setScopeLoading(false))
  }

  function prefetchScope(targetScope: Scope) {
    void fetchScope({
      scope: targetScope,
      period,
      offset: targetScope === scope ? periodOffset : 0,
      rankingLimit: targetScope === scope ? rankingLimit : 4,
    })
  }

  function handleScopeChange(next: Scope) {
    setSelectedBar(null)
    loadScope({ scope: next, offset: 0, rankingLimit: 4 })
  }

  function handlePeriodChange(next: AnalysePeriod) {
    setSelectedBar(null)
    loadScope({ period: next, offset: 0 })
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

    setRankingChartPending(true)
    void fetchAnalyseRankingChartAction({
      entityId,
      scope,
      period,
      offset: periodOffset,
      rankingItemId: id,
    })
      .then((result) => {
        if (!result.ok) return
        setExtraCharts((prev) => ({ ...prev, [key]: result.data }))
      })
      .finally(() => setRankingChartPending(false))
  }

  function handleShowMore() {
    const nextLimit = Math.min(20, rankingLimit + 6)
    loadScope({ rankingLimit: nextLimit })
  }

  const exportQuery = buildAnalyseQuery({ scope, period, offset: periodOffset, rankingLimit })

  return (
    <main className="analyse-page">
      <div className="anal-head">
        <h1 className="anal-head__title">Analyse globale</h1>
        <a
          href={`/dashboard/analyse/export?${exportQuery}`}
          className="anal-export"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Exporter</span>
          <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
        </a>
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
              disabled={scopeLoading}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {scopeLoading ? (
        <AnalyseContentSkeleton columnCount={columnCount} showStats={scope === 'service' || scope === 'event' || scope === 'shop'} />
      ) : (
        <>
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
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={period === p.id}
                    className={`anal-period__btn${period === p.id ? ' is-on' : ''}`}
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
                onClick={() => {
                  setSelectedBar(null)
                  loadScope({ offset: periodOffset + 1 })
                }}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {rankingChartPending ? (
              <div
                className="anal-chart__bars anal-skeleton-chart__bars"
                style={{ gridTemplateColumns: `repeat(${chartBars.length || columnCount}, 1fr)` }}
                aria-busy="true"
                aria-label="Chargement du graphique"
              >
                {Array.from({ length: chartBars.length || columnCount }, (_, i) => (
                  <div key={i} className="anal-skeleton-bar">
                    <div className="anal-skeleton-line anal-skeleton-line--xs" />
                    <div
                      className="anal-skeleton-bar__fill"
                      style={{ height: `${38 + ((i * 17) % 45)}%` }}
                    />
                    <div className="anal-skeleton-line anal-skeleton-line--xs" />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="anal-chart__bars"
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
            )}

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
              {data.ranking.hasMore ? (
                <button type="button" className="anal-card__more" onClick={handleShowMore}>
                  Afficher plus
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
