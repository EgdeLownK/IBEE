import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'apps/platform/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const client = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  const entityId = 'test-entity-id' // We just need to trigger the query to see if the syntax is valid or if there's a missing relation
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const { data, error } = await client
    .from('orders')
    .select('paid_at, total_cents')
    .eq('entity_id', entityId)
    .eq('status', 'paid')
    .eq('order_kind', 'product')
    .gte('paid_at', yearStart.toISOString())
    .order('paid_at', { ascending: false })
    .limit(1)

  console.log('Orders query result:', { data, error })

  const { data: bData, error: bError } = await client
    .from('bookings')
    .select('paid_at, price_cents')
    .eq('entity_id', entityId)
    .eq('payment_status', 'paid')
    .gte('paid_at', yearStart.toISOString())
    .order('paid_at', { ascending: false })
    .limit(1)

  console.log('Bookings query result:', { data: bData, error: bError })

  const { data: eData, error: eError } = await client
    .from('entity_expenses')
    .select('amount_cents, incurred_at')
    .eq('entity_id', entityId)
    .limit(1)

  console.log('Entity expenses query result:', { data: eData, error: eError })
}

testQuery()
