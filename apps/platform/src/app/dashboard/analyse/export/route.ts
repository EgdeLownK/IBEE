import { redirect } from 'next/navigation'
import { loadAnalyseScopeData } from '@/lib/analyse-data'
import {
  buildAnalyseCsv,
  EXPORT_SCOPE_OPTIONS,
  parseAnalyseExportSearchParams,
} from '@/lib/analyse-export'
import { getDashboardContext } from '@/lib/dashboard-context'

export async function GET(request: Request) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const url = new URL(request.url)
  const { scopes, sections, period, offset } = parseAnalyseExportSearchParams(url.searchParams)

  if (scopes.length === 0 || sections.length === 0) {
    return new Response('Sélection d’export invalide.', { status: 400 })
  }

  const scopeLabels = new Map(EXPORT_SCOPE_OPTIONS.map((option) => [option.id, option.label]))

  const payloads = await Promise.all(
    scopes.map(async (scope) => {
      const data = await loadAnalyseScopeData(ctx.supabase, ctx.entity.id, {
        scope,
        period,
        offset,
        rankingLimit: 20,
      })
      return {
        scopeLabel: scopeLabels.get(scope) ?? scope,
        data,
      }
    })
  )

  const csv = buildAnalyseCsv(payloads, sections)
  const scopeSlug = scopes.length === 1 ? scopes[0] : 'multi'
  const filename = `ibee-analyse-${scopeSlug}-${period}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
