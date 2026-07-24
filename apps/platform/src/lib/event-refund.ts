import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { getStripe } from '@/lib/stripe'

export async function refundEventOrderPayment(
  supabase: SupabaseClient<Database>,
  orderId: string,
  paymentIntentId: string,
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[refundEventOrderPayment] STRIPE_SECRET_KEY manquante — remboursement ignoré')
    return 0
  }

  const stripe = getStripe()
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId })
  const refundCents = refund.amount ?? 0

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'refunded',
      refund_cents: refundCents,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) throw error
  return refundCents
}
