import 'server-only'

import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { getEntityByUserId } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'
import {
  buildAccountShellData,
  type AccountShellData,
} from '@/lib/account-shell-data'
import { measureDashboardLoad } from '@/lib/dashboard-perf'

export type DashboardEntity = Database['public']['Tables']['entity']['Row']

export type DashboardContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
  entity: DashboardEntity
}

export const getDashboardContext = cache(async (): Promise<DashboardContext | null> => {
  return measureDashboardLoad('context:getDashboardContext', async () => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return null

    return { supabase, user, entity }
  })
})

export async function requireDashboardContext(): Promise<DashboardContext> {
  const ctx = await getDashboardContext()
  if (!ctx) {
    throw new Error('Dashboard context unavailable')
  }
  return ctx
}

export const getDashboardAccountShell = cache(
  async (): Promise<AccountShellData | null> => {
    return measureDashboardLoad('context:getDashboardAccountShell', async () => {
      const ctx = await getDashboardContext()
      if (!ctx) return null
      return buildAccountShellData(ctx.user, ctx.entity)
    })
  }
)
