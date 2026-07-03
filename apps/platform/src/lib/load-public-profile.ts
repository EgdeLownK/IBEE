import { createClient } from '@/lib/supabase/server'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import {
  countEventRegistrations,
  defaultOpeningHours,
  getEntityBySlug,
  getEntityContactInfo,
  getEntityFaq,
  getEntityHistory,
  getEntityHomeWidgets,
  getEntityMenuSections,
  getAppointmentTypesByEntity,
  getPublicationsByEntity,
  getReviewAggregates,
  getServiceReviewAggregates,
  isFollowing as checkIsFollowing,
  listProductCategories,
  listPublishedProductsByEntity,
  listUpcomingEvents,
} from '@ibee/supabase'

export async function loadPublicProfileBySlug(slug: string) {
  const supabase = await createClient()

  const [entity, authResult] = await Promise.all([
    getEntityBySlug(supabase, slug),
    supabase.auth.getUser(),
  ])

  if (!entity) return null

  const user = authResult.data.user
  const entityRow = entity as typeof entity & { banner_url?: string | null; updated_at?: string }

  const [
    menuSections,
    homeWidgetsRaw,
    historyBlocks,
    contactInfoRaw,
    faq,
    publications,
    appointmentTypes,
    products,
    productCategories,
    upcomingEvents,
  ] = await Promise.all([
    getEntityMenuSections(supabase, entity.id),
    getEntityHomeWidgets(supabase, entity.id),
    getEntityHistory(supabase, entity.id).catch(() => []),
    getEntityContactInfo(supabase, entity.id).catch(() => null),
    getEntityFaq(supabase, entity.id),
    getPublicationsByEntity(supabase, entity.id, { publicOnly: true, limit: 50 }),
    getAppointmentTypesByEntity(supabase, entity.id, { activeOnly: true }),
    listPublishedProductsByEntity(supabase, entity.id, { limit: 60 }),
    listProductCategories(supabase, entity.id),
    listUpcomingEvents(supabase, entity.id),
  ])

  const eventRegistrationCounts = await Promise.all(
    upcomingEvents.map((ev) =>
      ev.capacity != null ? countEventRegistrations(supabase, ev.id).catch(() => 0) : Promise.resolve(0)
    )
  )

  const events = upcomingEvents.map((ev, i) => ({
    ...ev,
    registrations_count: eventRegistrationCounts[i],
  }))

  const [productReviewStats, serviceReviewStats, isFollowing] = await Promise.all([
    Promise.all(
      products.map((p) => getReviewAggregates(supabase, p.id).catch(() => ({ count: 0, average: 0 })))
    ),
    Promise.all(
      appointmentTypes.map((s) =>
        getServiceReviewAggregates(supabase, s.id).catch(() => ({ count: 0, average: 0 }))
      )
    ),
    user ? checkIsFollowing(supabase, user.id, entity.id) : Promise.resolve(false),
  ])

  const shopProducts = products.map((p, i) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    detailExcerpt: entityDetailExcerpt(p),
    reviewCount: productReviewStats[i].count,
    reviewAverage: productReviewStats[i].average,
    price_cents: p.price_cents,
    sale_price_cents: p.sale_price_cents,
    sale_ends_at: p.sale_ends_at,
    currency: p.currency,
    image_url: p.product_media?.[0]?.url ?? null,
    image_urls: (p.product_media ?? [])
      .filter((m) => !m.media_type || m.media_type === 'image')
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((m) => m.url),
    status: p.status,
    category_id: p.category_id,
    type: p.type,
    physical_stock_quantity: p.physical_stock_quantity,
  }))

  const playlistServices = appointmentTypes.map((s, i) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    detailExcerpt: entityDetailExcerpt(s),
    reviewCount: serviceReviewStats[i].count,
    reviewAverage: serviceReviewStats[i].average,
    duration_minutes: s.duration_minutes,
    location_type: s.location_type,
    price_cents: s.price_cents,
    promo_price_cents: s.promo_price_cents,
    currency: s.currency,
    image_url: s.gallery_images?.[0] ?? null,
    image_urls: [...(s.gallery_images ?? [])].filter(Boolean),
  }))

  const playlistEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    slug: ev.slug,
    detailExcerpt: entityDetailExcerpt(ev),
    start_at: ev.start_at,
    price_cents: ev.price_cents,
    currency: ev.currency,
    location_type: ev.location_type,
    location_details: ev.location_details,
    capacity: ev.capacity,
    registrations_count: ev.registrations_count,
    image_url: ev.gallery_images?.[0] ?? null,
    image_urls: [...(ev.gallery_images ?? [])].filter(Boolean),
  }))

  const homeWidgets = homeWidgetsRaw.map((w) => ({
    ...w,
    config:
      typeof w.config === 'string'
        ? (() => {
            try {
              return JSON.parse(w.config)
            } catch {
              return {}
            }
          })()
        : (w.config ?? {}),
  }))

  const faqItems = (faq.items ?? []).map((item) => ({
    question: item.question,
    answer: item.answer,
  }))

  const contactInfo = contactInfoRaw ?? {
    entity_id: entity.id,
    contact_email: null,
    contact_email_public: true,
    contact_phone: null,
    contact_phone_public: true,
    message_enabled: false,
    opening_hours_enabled: false,
    opening_hours: defaultOpeningHours(),
  }

  const isOwner = !!(user && entity.user_id && user.id === entity.user_id)
  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  return {
    entity: {
      id: entity.id,
      user_id: entity.user_id,
      slug: entity.slug,
      display_name: entity.display_name,
      role: entity.role,
      location: entity.location,
      bio: entity.bio,
      avatar_url: entity.avatar_url,
      banner_url: entityRow.banner_url ?? null,
      created_at: entity.created_at,
      updated_at: entityRow.updated_at ?? entity.created_at,
      followers_count: entity.followers_count ?? 0,
    },
    menuSections,
    homeWidgets,
    historyBlocks,
    contactInfo,
    faqItems,
    faqActive: faq.isActive,
    publications,
    shopProducts,
    productCategories: productCategories.map((c) => ({ id: c.id, name: c.name })),
    playlistServices,
    playlistEvents,
    isAuthenticated: !!user,
    isFollowing,
    isOwner,
    profileUrl: `${siteUrl}/${entity.slug}`,
    entityBaseUrl: `/${entity.slug}`,
    siteUrl,
  }
}

export type PublicProfileData = NonNullable<Awaited<ReturnType<typeof loadPublicProfileBySlug>>>
