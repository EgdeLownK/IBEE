import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AnalyseDashboard } from '@/components/dashboard/analyse/AnalyseDashboard'
import { AnalysePageSkeleton } from '@/components/dashboard/analyse/AnalyseContentSkeleton'
import {
  loadAnalyseScopeData,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
  type AnalyseScope,
} from '@/lib/analyse-data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import type { AnalysePeriod } from '@/lib/analyse-period'
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

type LoaderProps = {
  supabase: SupabaseClient<Database>
  entityId: string
  accountCreatedAt: string
  scope: AnalyseScope
  period: AnalysePeriod
  offset: number
  rankingLimit: number
}

async function AnalyseDashboardLoader({
  supabase,
  entityId,
  accountCreatedAt,
  scope,
  period,
  offset,
  rankingLimit,
}: LoaderProps) {
  const data = await measureDashboardLoad('page:analyse', () =>
    loadAnalyseScopeData(supabase, entityId, {
      scope,
      period,
      offset,
      rankingLimit,
    }),
    { scope, period, offset }
  )

  return (
    <AnalyseDashboard
      entityId={entityId}
      accountCreatedAt={accountCreatedAt}
      data={data}
      initialRankingLimit={rankingLimit}
    />
  )
}

export default async function AnalysePage({ searchParams }: PageProps) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const params = await searchParams
  const scope = parseAnalyseScope(params.scope)
  const period = parseAnalysePeriod(params.period)
  const offset = parseAnalyseOffset(params.offset)
  const rankingLimit = Math.min(20, Math.max(4, Number(params.rankingLimit ?? '4') || 4))

  return (
    <Suspense fallback={<AnalysePageSkeleton />}>
      <AnalyseDashboardLoader
        supabase={ctx.supabase}
        entityId={ctx.entity.id}
        accountCreatedAt={ctx.entity.created_at}
        scope={scope}
        period={period}
        offset={offset}
        rankingLimit={rankingLimit}
      />
    </Suspense>
  )
}
