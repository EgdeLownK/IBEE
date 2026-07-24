import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AnalyseDashboard } from '@/components/dashboard/analyse/AnalyseDashboard'
import {
  loadAnalyseScopeData,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
} from '@/lib/analyse-data'
import { getDashboardContext } from '@/lib/dashboard-context'
import { measureDashboardLoad } from '@/lib/dashboard-perf'

export const metadata: Metadata = {
  title: 'Analyse',
}

type PageProps = {
  searchParams: Promise<{
    scope?: string
    period?: string
    offset?: string
    rankingLimit?: string
  }>
}

function buildAnalysePath(params: {
  scope?: string
  period?: string
  offset?: string
  rankingLimit?: string
}) {
  const qs = new URLSearchParams()
  const scope = parseAnalyseScope(params.scope)
  const period = parseAnalysePeriod(params.period)
  const offset = parseAnalyseOffset(params.offset)
  const rankingLimit = Math.min(20, Math.max(4, Number(params.rankingLimit ?? '4') || 4))

  qs.set('scope', scope)
  qs.set('period', period)
  if (offset !== 0) qs.set('offset', String(offset))
  if (rankingLimit !== 4) qs.set('rankingLimit', String(rankingLimit))

  return `/dashboard/analyse?${qs.toString()}`
}

export default async function AnalysePage({ searchParams }: PageProps) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const params = await searchParams

  if (params.period === 'month') {
    redirect(
      buildAnalysePath({
        scope: params.scope,
        period: 'week',
        offset: params.offset,
        rankingLimit: params.rankingLimit,
      }),
    )
  }

  const scope = parseAnalyseScope(params.scope)
  const period = parseAnalysePeriod(params.period)
  const offset = parseAnalyseOffset(params.offset)
  const rankingLimit = Math.min(20, Math.max(4, Number(params.rankingLimit ?? '4') || 4))

  const currentData = await measureDashboardLoad(
    'page:analyse',
    () =>
      loadAnalyseScopeData(ctx.supabase, ctx.entity.id, {
        scope,
        period,
        offset,
        rankingLimit,
      }),
    { scope, period, offset },
  )

  return (
    <AnalyseDashboard
      entityId={ctx.entity.id}
      accountCreatedAt={ctx.entity.created_at}
      data={currentData}
      initialRankingLimit={rankingLimit}
    />
  )
}
