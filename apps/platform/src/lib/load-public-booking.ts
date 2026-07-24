import { createClient } from '@/lib/supabase/server'
import { formatDetailPrice, locationLabel } from '@/lib/detail-format'
import {
  formatCancellationPolicyLabel,
  getAppointmentTypeBySlug,
  getEntityBySlug,
  getEntityByUserId,
  requiresBookingPayment,
  resolveAppointmentChargeCents,
} from '@ibee/supabase'

export async function loadPublicBooking(slug: string, serviceSlug: string) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const service = await getAppointmentTypeBySlug(supabase, entity.id, serviceSlug)
  if (!service || !service.is_active) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let bookerName = ''
  if (user) {
    const bookerEntity = await getEntityByUserId(supabase, user.id)
    bookerName = bookerEntity?.display_name ?? ''
  }

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const chargeCents = resolveAppointmentChargeCents(service)
  const needsPayment = requiresBookingPayment(service)

  return {
    entity: {
      id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
    },
    service: {
      id: service.id,
      title: service.title,
      slug: service.slug,
      duration_minutes: service.duration_minutes,
      location_type: service.location_type,
      price_cents: service.price_cents,
      promo_price_cents: service.promo_price_cents,
      currency: service.currency,
      payment_required: service.payment_required,
      deposit_percent: service.deposit_percent,
      cancel_min_hours: service.cancel_min_hours,
    },
    bookerName,
    bookerEmail: user?.email ?? '',
    isLoggedIn: !!user,
    priceText: formatDetailPrice(service.price_cents, service.currency),
    chargeCents,
    needsPayment,
    chargeLabel: chargeCents > 0 ? formatDetailPrice(chargeCents, service.currency) : null,
    cancellationPolicyLabel: formatCancellationPolicyLabel(service.cancel_min_hours),
    locationLabel: locationLabel(service.location_type),
    profileHref: `/${entity.slug}`,
    serviceHref: `/${entity.slug}/services/${service.slug}`,
    backHref: `/${entity.slug}/services/${service.slug}`,
    confirmedBaseHref: `/${entity.slug}/services/${service.slug}/confirmed`,
    siteUrl,
    profileUrl: `${siteUrl}/${entity.slug}`,
  }
}

export type PublicBookingData = NonNullable<Awaited<ReturnType<typeof loadPublicBooking>>>
