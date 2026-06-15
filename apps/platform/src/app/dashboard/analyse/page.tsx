import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
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

export default async function AnalysePage({ searchParams }: PageProps) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const params = await searchParams
  const scope = parseAnalyseScope(params.scope)
  const period = parseAnalysePeriod(params.period)
  const offset = parseAnalyseOffset(params.offset)
  const rankingLimit = Math.min(20, Math.max(4, Number(params.rankingLimit ?? '4') || 4))

  const data = await measureDashboardLoad('page:analyse', () =>
    loadAnalyseScopeData(ctx.supabase, ctx.entity.id, {
      scope,
      period,
      offset,
      rankingLimit,
    }),
    { scope, period, offset }
  )

  return (
    <Suspense fallback={null}>
      <AnalyseDashboard
        entityId={ctx.entity.id}
        accountCreatedAt={ctx.entity.created_at}
        data={data}
        initialRankingLimit={rankingLimit}
      />
    </Suspense>
  )
}
