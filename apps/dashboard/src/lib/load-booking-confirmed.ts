import { createClient } from '@/lib/supabase/server'
import { formatDetailPrice, locationLabel } from '@/lib/detail-format'
import {
  getAppointmentTypeBySlug,
  getAppointmentTypesByEntity,
  getEntityBySlug,
} from '@ibee/supabase'

export async function loadBookingConfirmed(slug: string, serviceSlug: string) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const service = await getAppointmentTypeBySlug(supabase, entity.id, serviceSlug)
  if (!service) return null

  const allTypes = await getAppointmentTypesByEntity(supabase, entity.id, { activeOnly: true })
  const otherServices = allTypes.filter((t) => t.id !== service.id)

  return {
    entity: {
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
      currency: service.currency,
    },
    otherServices,
    priceText: formatDetailPrice(service.price_cents, service.currency),
    locationLabel: locationLabel(service.location_type),
    profileHref: `/${entity.slug}`,
    serviceHref: `/${entity.slug}/services/${service.slug}`,
  }
}

export type BookingConfirmedData = NonNullable<Awaited<ReturnType<typeof loadBookingConfirmed>>>
