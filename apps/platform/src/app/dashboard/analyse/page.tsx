import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getEntityByUserId } from '@ibee/supabase'
import { AnalyseDashboard } from '@/components/dashboard/analyse/AnalyseDashboard'
import {
  loadAnalyseScopeData,
  parseAnalyseOffset,
  parseAnalysePeriod,
  parseAnalyseScope,
} from '@/lib/analyse-data'
import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const params = await searchParams
  const scope = parseAnalyseScope(params.scope)
  const period = parseAnalysePeriod(params.period)
  const offset = parseAnalyseOffset(params.offset)
  const rankingLimit = Math.min(20, Math.max(4, Number(params.rankingLimit ?? '4') || 4))

  const data = await loadAnalyseScopeData(supabase, entity.id, {
    scope,
    period,
    offset,
    rankingLimit,
  })

  return (
    <Suspense fallback={null}>
      <AnalyseDashboard accountCreatedAt={entity.created_at} data={data} />
    </Suspense>
  )
}
