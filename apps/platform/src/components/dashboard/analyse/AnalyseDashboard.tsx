'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
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
import { getChartColumnCount, getMinPeriodOffset, getPeriodWindow, type AnalysePeriod } from '@/lib/analyse-period'
import type { AnalyseScopePayload } from '@/lib/analyse-data'

type Scope = AnalyseScopePayload['scope']

type ChartSeries = {
  source: 'kpi' | 'ranking'
  id: string
}

type Props = {
  accountCreatedAt: string
  data: AnalyseScopePayload
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

export function AnalyseDashboard({ accountCreatedAt, data }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [chartSeries, setChartSeries] = useState<ChartSeries>(() => defaultChartSeries(data))
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  const scope = data.scope
  const period = data.period
  const periodOffset = data.offset

  const minOffset = useMemo(
    () => getMinPeriodOffset(period, accountCreatedAt),
    [period, accountCreatedAt]
  )

  const activeSeriesKey = seriesKey(chartSeries)
  const chartBars = data.chartSeries[activeSeriesKey] ?? data.chartSeries[`kpi:${data.kpis[0]?.id}`] ?? []
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
    setChartSeries(defaultChartSeries(data))
    setSelectedBar(null)
  }, [data.scope, data.period, data.offset])

  const canGoBack = periodOffset > minOffset
  const canGoForward = periodOffset < 0

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, String(value))
    }
    startTransition(() => {
      router.push(`/dashboard/analyse?${params.toString()}`)
    })
  }

  function handleScopeChange(next: Scope) {
    setChartSeries({ source: 'kpi', id: data.kpis[0]?.id ?? 'visitors' })
    setSelectedBar(null)
    pushParams({ scope: next, offset: 0 })
  }

  function handlePeriodChange(next: AnalysePeriod) {
    setSelectedBar(null)
    pushParams({ period: next, offset: 0 })
  }

  function selectKpi(id: string) {
    setChartSeries({ source: 'kpi', id })
    setSelectedBar(null)
  }

  function selectRanking(id: string) {
    setChartSeries({ source: 'ranking', id })
    setSelectedBar(null)
  }

  function handleShowMore() {
    const current = Number(searchParams.get('rankingLimit') ?? '4')
    pushParams({ rankingLimit: current + 6 })
  }

  return (
    <main className={`analyse-page${pending ? ' is-loading' : ''}`}>
      <div className="anal-head">
        <h1 className="anal-head__title">Analyse globale</h1>
        <a
          href={`/dashboard/analyse/export?scope=${scope}&period=${period}&offset=${periodOffset}`}
          className="anal-export"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Exporter</span>
          <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
        </a>
      </div>

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
              onClick={() => handleScopeChange(s.id)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

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
            disabled={!canGoBack || pending}
            onClick={() => {
              setSelectedBar(null)
              pushParams({ offset: periodOffset - 1 })
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
            disabled={!canGoForward || pending}
            onClick={() => {
              setSelectedBar(null)
              pushParams({ offset: periodOffset + 1 })
            }}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

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
    </main>
  )
}
