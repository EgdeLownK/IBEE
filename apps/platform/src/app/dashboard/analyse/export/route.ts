import { redirect } from 'next/navigation'
import {
  loadAnalyseScopeData,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
} from '@/lib/analyse-data'
import { getDashboardContext } from '@/lib/dashboard-context'

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(request: Request) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const url = new URL(request.url)
  const scope = parseAnalyseScope(url.searchParams.get('scope') ?? undefined)
  const period = parseAnalysePeriod(url.searchParams.get('period') ?? undefined)
  const offset = parseAnalyseOffset(url.searchParams.get('offset') ?? undefined)

  const data = await loadAnalyseScopeData(ctx.supabase, ctx.entity.id, {
    scope,
    period,
    offset,
    rankingLimit: 20,
  })

  const lines: string[] = []
  lines.push(`Scope,${csvEscape(data.scope)}`)
  lines.push(`Période,${csvEscape(data.rangeLabel)}`)
  lines.push('')
  lines.push('KPI,Valeur,Delta')
  for (const kpi of data.kpis) {
    lines.push(`${csvEscape(kpi.k)},${csvEscape(kpi.v)},${csvEscape(kpi.d)}`)
  }
  lines.push('')
  lines.push('Série,Libellé,Valeur')
  const seriesKey = `kpi:${data.kpis[0]?.id}`
  const bars = data.chartSeries[seriesKey] ?? []
  for (const bar of bars) {
    lines.push(`${csvEscape(seriesKey)},${csvEscape(bar.label)},${bar.value}`)
  }
  lines.push('')
  lines.push(`Classement — ${csvEscape(data.ranking.title)}`)
  lines.push('Rang,Libellé,Part,Total')
  data.ranking.items.forEach((item, index) => {
    lines.push(
      `${index + 1},${csvEscape(item.k)},${csvEscape(item.v)},${csvEscape(item.n)}`
    )
  })

  const csv = `\uFEFF${lines.join('\n')}`
  const filename = `ibee-analyse-${scope}-${period}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
