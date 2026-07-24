import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { getStripe } from '@/lib/stripe'

export async function refundBookingPayment(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  paymentIntentId: string,
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[refundBookingPayment] STRIPE_SECRET_KEY manquante — remboursement ignoré')
    return
  }

  const stripe = getStripe()
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId })

  const refundCents = refund.amount ?? 0

  const { error } = await supabase
    .from('bookings')
    .update({
      payment_status: 'refunded',
      refund_cents: refundCents,
    })
    .eq('id', bookingId)

  if (error) throw error
}
