'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import type { BookingExtendedStats } from '@agora/supabase'

type Props = {
  weekChart: BookingExtendedStats['weekChart']
  yearChart: BookingExtendedStats['yearChart']
  recap: BookingExtendedStats['recap']
}

type Mode = 'week' | 'year'

function formatEuros(cents: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(cents / 100))
}

function rangeLabel(mode: Mode): string {
  const now = new Date()
  if (mode === 'year') return String(now.getFullYear())
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt.format(start)} – ${fmt.format(end)} ${end.getFullYear()}`
}

export function AppointmentsChartHero({ weekChart, yearChart, recap }: Props) {
  const [mode, setMode] = useState<Mode>('week')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement | null>(null)

  const chartData = mode === 'week' ? weekChart : yearChart
  const maxValue = Math.max(...chartData.map((d) => d.count), 1)

  useEffect(() => {
    if (selectedIndex === null) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target || !chartRef.current?.contains(target)) {
        setSelectedIndex(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedIndex])

  const displayStats = useMemo(() => {
    if (selectedIndex !== null && chartData[selectedIndex]) {
      const s = chartData[selectedIndex]
      return {
        count: s.count,
        revenue: s.revenue,
        pending: null as number | null,
        confirmed: null as number | null,
        cancelled: null as number | null,
        rate: null as number | null,
      }
    }
    const base = mode === 'week' ? recap.week : recap.year
    const rate = base.count > 0 ? Math.round((base.confirmed / base.count) * 100) : null
    return {
      count: base.count,
      revenue: base.revenue,
      pending: base.pending,
      confirmed: base.confirmed,
      cancelled: base.cancelled + base.noShow,
      rate,
    }
  }, [selectedIndex, chartData, mode, recap])

  return (
    <div ref={chartRef} className="rounded-xl border border-neutral-200 bg-neutral-0 p-8 shadow-sm">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-900">Performance des rendez-vous</h3>
          <div className="mt-1 flex items-center gap-1.5 text-neutral-400">
            <Calendar className="h-4 w-4" aria-hidden />
            <span className="text-sm font-semibold text-neutral-500">{rangeLabel(mode)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 rounded-md bg-neutral-100 p-1">
            {(['week', 'year'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setSelectedIndex(null)
                }}
                className={`rounded-sm px-3.5 py-1.5 text-xs font-bold transition ${
                  mode === m
                    ? 'bg-neutral-0 text-neutral-900 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {m === 'week' ? 'Semaine' : 'Année'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-neutral-100 bg-neutral-50 p-1">
            <button
              type="button"
              aria-label="Période précédente"
              disabled
              className="flex rounded-sm p-1.5 text-neutral-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[52px] text-center text-xs font-bold text-neutral-900">Actuel</span>
            <button
              type="button"
              aria-label="Période suivante"
              disabled
              className="flex rounded-sm p-1.5 text-neutral-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-60 items-end gap-2" role="img" aria-label="Graphique des rendez-vous par période">
        {chartData.map((data, i) => {
          const h = (data.count / maxValue) * 100
          const selected = selectedIndex === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(selected ? null : i)}
              className="group flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-2.5"
              aria-label={`${data.label} : ${data.count} RDV`}
            >
              <div
                className={`flex h-full w-full max-w-[44px] items-end overflow-hidden rounded-t-md transition ${
                  selected
                    ? 'bg-accent-soft ring-2 ring-accent/30'
                    : 'bg-neutral-50 group-hover:bg-accent-soft'
                }`}
              >
                <div
                  className={`w-full rounded-t-md transition-[height,background-color] duration-500 ease-out ${
                    selected
                      ? 'bg-accent'
                      : 'bg-gradient-to-t from-neutral-400 to-neutral-200 group-hover:bg-accent group-hover:from-accent group-hover:to-accent'
                  }`}
                  style={{ height: `${h}%`, minHeight: data.count > 0 ? 4 : 0 }}
                />
              </div>
              <span
                className={`text-[10px] font-bold transition ${
                  selected
                    ? 'scale-110 text-accent'
                    : 'text-neutral-400 group-hover:text-accent'
                }`}
              >
                {data.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-6 md:grid-cols-5">
        <Kpi label="RDV" value={displayStats.count.toString()} />
        <Kpi label="Revenu" value={`${formatEuros(displayStats.revenue)}€`} />
        <Kpi label="En attente" value={displayStats.pending !== null ? displayStats.pending.toString() : '—'} />
        <Kpi label="Confirmés" value={displayStats.confirmed !== null ? displayStats.confirmed.toString() : '—'} />
        <Kpi label="Taux confirm." value={displayStats.rate !== null ? `${displayStats.rate}%` : '—'} />
      </div>

      {selectedIndex !== null && (
        <p className="mt-4 rounded-md bg-accent-soft px-4 py-2 text-center text-xs font-semibold text-accent">
          Données pour : {chartData[selectedIndex]!.label}
        </p>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
    </div>
  )
}
