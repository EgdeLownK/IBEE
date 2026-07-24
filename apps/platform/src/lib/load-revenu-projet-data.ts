import 'server-only'

import {
  getProjectPayoutSnapshot,
  getProjectRevenueSnapshot,
  type ProjectPayoutSnapshot,
  type ProjectRevenueSnapshot,
} from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'

type Client = SupabaseClient<Database>

export type RevenuProjetData = {
  revenue: ProjectRevenueSnapshot
  payouts: ProjectPayoutSnapshot
}

export async function loadRevenuProjetData(
  client: Client,
  entityId: string,
  owner: { name: string; email: string },
): Promise<RevenuProjetData> {
  const [revenue, payouts] = await Promise.all([
    getProjectRevenueSnapshot(client, entityId),
    getProjectPayoutSnapshot(client, entityId, owner),
  ])

  return { revenue, payouts }
}
