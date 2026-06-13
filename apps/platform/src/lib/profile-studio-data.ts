import { createClient } from '@/lib/supabase/server'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import {
  defaultOpeningHours,
  getEntityByUserId,
  getEntityContactInfo,
  getEntityFaq,
  getEntityHistory,
  getEntityHomeWidgets,
  getEntityMenuSections,
  getPublicationsByEntity,
  getReviewAggregates,
  getServiceReviewAggregates,
  getAppointmentTypesByEntity,
  listMenuSectionStates,
  listProductCategories,
  listProductsByEntity,
  listUpcomingEventsForOwner,
} from '@ibee/supabase'

export async function loadProfileStudioData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return null

  const [
    menuSections,
    sectionOptions,
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
    listMenuSectionStates(supabase, entity.id),
    getEntityHomeWidgets(supabase, entity.id),
    getEntityHistory(supabase, entity.id).catch(() => []),
    getEntityContactInfo(supabase, entity.id).catch(() => null),
    getEntityFaq(supabase, entity.id),
    getPublicationsByEntity(supabase, entity.id, { publicOnly: false, limit: 50 }),
    getAppointmentTypesByEntity(supabase, entity.id, { activeOnly: true }),
    listProductsByEntity(supabase, entity.id, { limit: 60 }),
    listProductCategories(supabase, entity.id),
    listUpcomingEventsForOwner(supabase, entity.id),
  ])

  const [productReviewStats, serviceReviewStats] = await Promise.all([
    Promise.all(
      products.map((p) => getReviewAggregates(supabase, p.id).catch(() => ({ count: 0, average: 0 })))
    ),
    Promise.all(
      appointmentTypes.map((s) =>
        getServiceReviewAggregates(supabase, s.id).catch(() => ({ count: 0, average: 0 }))
      )
    ),
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
  }))

  const playlistEvents = upcomingEvents.map((ev) => ({
    id: ev.id,
    title: ev.title,
    slug: ev.slug,
    detailExcerpt: entityDetailExcerpt(ev),
    start_at: ev.start_at,
    price_cents: ev.price_cents,
    currency: ev.currency,
    image_url: ev.gallery_images?.[0] ?? null,
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

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000'

  const entityRow = entity as typeof entity & { banner_url?: string | null }

  return {
    entity: {
      id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      role: entity.role,
      location: entity.location,
      bio: entity.bio,
      avatar_url: entity.avatar_url,
      banner_url: entityRow.banner_url ?? null,
      created_at: entity.created_at,
      followers_count: entity.followers_count ?? 0,
    },
    menuSections,
    sectionOptions,
    homeWidgets,
    historyBlocks,
    contactInfo,
    faqItems,
    publications,
    shopProducts,
    productCategories,
    playlistServices,
    playlistEvents,
    publicProfileUrl: `/${entity.slug}?preview=1`,
    webEditUrl: `/${entity.slug}`,
    dashboardUrl,
    webUrl,
  }
}

export type ProfileStudioData = NonNullable<Awaited<ReturnType<typeof loadProfileStudioData>>>
