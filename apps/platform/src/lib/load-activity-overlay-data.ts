import 'server-only'

import { listProductCategories } from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'

type Client = SupabaseClient<Database>

export type ActivityOverlayData = {
  productCategories: Array<{ id: string; name: string }>
}

export async function loadActivityOverlayData(
  client: Client,
  entityId: string,
): Promise<ActivityOverlayData> {
  const categories = await listProductCategories(client, entityId).catch(() => [])
  return {
    productCategories: categories.map((category) => ({ id: category.id, name: category.name })),
  }
}
