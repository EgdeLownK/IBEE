import type { AnalyseScope, AnalyseScopePayload } from '@/lib/analyse-data'
import { parseAnalyseOffset, parseAnalysePeriod } from '@/lib/analyse-data'

export const EXPORT_SCOPE_OPTIONS: { id: AnalyseScope; label: string }[] = [
  { id: 'web', label: 'Profil web' },
  { id: 'service', label: 'Service' },
  { id: 'shop', label: 'Shop' },
  { id: 'event', label: 'Event' },
  { id: 'news', label: 'News' },
]

export type AnalyseExportSection = 'kpis' | 'chart' | 'ranking' | 'stats'

export const EXPORT_SECTION_OPTIONS: { id: AnalyseExportSection; label: string }[] = [
  { id: 'kpis', label: 'Indicateurs' },
  { id: 'chart', label: 'Graphique' },
  { id: 'ranking', label: 'Classement' },
  { id: 'stats', label: 'Statistiques' },
]

export const ALL_EXPORT_SCOPES = EXPORT_SCOPE_OPTIONS.map((s) => s.id)
export const ALL_EXPORT_SECTIONS = EXPORT_SECTION_OPTIONS.map((s) => s.id)

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseCsvList(value: string | null): string[] {
  if (!value || value === 'all') return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function parseExportScopes(value: string | null): AnalyseScope[] {
  const raw = parseCsvList(value)
  if (raw.length === 0) return [...ALL_EXPORT_SCOPES]
  const allowed = new Set(ALL_EXPORT_SCOPES)
  return raw.filter((id): id is AnalyseScope => allowed.has(id as AnalyseScope))
}

export function parseExportSections(value: string | null): AnalyseExportSection[] {
  const raw = parseCsvList(value)
  if (raw.length === 0) return [...ALL_EXPORT_SECTIONS]
  const allowed = new Set(ALL_EXPORT_SECTIONS)
  return raw.filter((id): id is AnalyseExportSection =>
    allowed.has(id as AnalyseExportSection)
  )
}

export function buildAnalyseExportQuery(input: {
  scopes: AnalyseScope[]
  sections: AnalyseExportSection[]
  period: string
  offset: number
}) {
  const params = new URLSearchParams()
  if (input.scopes.length === ALL_EXPORT_SCOPES.length) {
    params.set('scopes', 'all')
  } else {
    params.set('scopes', input.scopes.join(','))
  }
  if (input.sections.length === ALL_EXPORT_SECTIONS.length) {
    params.set('sections', 'all')
  } else {
    params.set('sections', input.sections.join(','))
  }
  params.set('period', input.period)
  if (input.offset !== 0) {
    params.set('offset', String(input.offset))
  }
  return params.toString()
}

export function buildAnalyseCsv(
  rows: Array<{ scopeLabel: string; data: AnalyseScopePayload }>,
  sections: AnalyseExportSection[]
) {
  const lines: string[] = []
  const include = new Set(sections)

  rows.forEach((row, index) => {
    const { data, scopeLabel } = row
    if (index > 0) lines.push('')

    lines.push(`Catégorie,${csvEscape(scopeLabel)}`)
    lines.push(`Période,${csvEscape(data.rangeLabel)}`)

    if (include.has('kpis')) {
      lines.push('')
      lines.push('Indicateurs')
      lines.push('KPI,Valeur,Delta')
      for (const kpi of data.kpis) {
        lines.push(`${csvEscape(kpi.k)},${csvEscape(kpi.v)},${csvEscape(kpi.d)}`)
      }
    }

    if (include.has('chart')) {
      lines.push('')
      lines.push('Graphique')
      lines.push('Série,Libellé,Valeur')
      for (const [seriesKey, bars] of Object.entries(data.chartSeries)) {
        for (const bar of bars) {
          lines.push(`${csvEscape(seriesKey)},${csvEscape(bar.label)},${bar.value}`)
        }
      }
    }

    if (include.has('stats') && data.stats?.length) {
      lines.push('')
      lines.push('Statistiques')
      lines.push('Libellé,Valeur')
      for (const stat of data.stats) {
        lines.push(`${csvEscape(stat.l)},${csvEscape(stat.v)}`)
      }
    }

    if (include.has('ranking')) {
      lines.push('')
      lines.push(`Classement — ${csvEscape(data.ranking.title)}`)
      lines.push('Rang,Libellé,Part,Total')
      data.ranking.items.forEach((item, rank) => {
        lines.push(
          `${rank + 1},${csvEscape(item.k)},${csvEscape(item.v)},${csvEscape(item.n)}`
        )
      })
    }
  })

  return `\uFEFF${lines.join('\n')}`
}

export function parseAnalyseExportSearchParams(searchParams: URLSearchParams) {
  return {
    scopes: parseExportScopes(searchParams.get('scopes')),
    sections: parseExportSections(searchParams.get('sections')),
    period: parseAnalysePeriod(searchParams.get('period') ?? undefined),
    offset: parseAnalyseOffset(searchParams.get('offset') ?? undefined),
  }
}
