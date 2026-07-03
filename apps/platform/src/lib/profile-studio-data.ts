import 'server-only'

import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import { getDashboardContext } from '@/lib/dashboard-context'
import {
  defaultOpeningHours,
  getEntityContactInfo,
  getEntityFaq,
  getEntityHistory,
  getEntityHomeWidgets,
  getEntityMenuSections,
  getPublicationsByEntity,
  getReviewAggregates,
  getServiceReviewAggregates,
  getAppointmentTypesByEntity,
  countEventRegistrations,
  listMenuSectionStates,
  listProductCategories,
  listProductsByEntity,
  listUpcomingEventsForOwner,
} from '@ibee/supabase'

function mapHomeWidgets(homeWidgetsRaw: Awaited<ReturnType<typeof getEntityHomeWidgets>>) {
  return homeWidgetsRaw.map((w) => ({
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
}

function mapContactInfo(
  entityId: string,
  contactInfoRaw: Awaited<ReturnType<typeof getEntityContactInfo>> | null
) {
  return (
    contactInfoRaw ?? {
      entity_id: entityId,
      contact_email: null,
      contact_email_public: true,
      contact_phone: null,
      contact_phone_public: true,
      message_enabled: false,
      opening_hours_enabled: false,
      opening_hours: defaultOpeningHours(),
    }
  )
}

export async function loadProfileStudioShell() {
  const ctx = await getDashboardContext()
  if (!ctx) return null

  const { supabase, entity } = ctx

  const [menuSections, sectionOptions, homeWidgetsRaw, historyBlocks, contactInfoRaw, faq] =
    await Promise.all([
      getEntityMenuSections(supabase, entity.id),
      listMenuSectionStates(supabase, entity.id),
      getEntityHomeWidgets(supabase, entity.id),
      getEntityHistory(supabase, entity.id).catch(() => []),
      getEntityContactInfo(supabase, entity.id).catch(() => null),
      getEntityFaq(supabase, entity.id),
    ])

  const faqItems = (faq.items ?? []).map((item) => ({
    question: item.question,
    answer: item.answer,
  }))

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? `${webUrl}/dashboard/site`
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
    homeWidgets: mapHomeWidgets(homeWidgetsRaw),
    historyBlocks,
    contactInfo: mapContactInfo(entity.id, contactInfoRaw),
    faqItems,
    publicProfileUrl: `/${entity.slug}?preview=1`,
    webEditUrl: `/${entity.slug}`,
    dashboardUrl,
    webUrl,
  }
}

export async function loadProfileStudioPlaylists() {
  const ctx = await getDashboardContext()
  if (!ctx) return null

  const { supabase, entity } = ctx

  const [publications, appointmentTypes, products, productCategories, upcomingEvents] =
    await Promise.all([
      getPublicationsByEntity(supabase, entity.id, { publicOnly: false, limit: 50 }),
      getAppointmentTypesByEntity(supabase, entity.id, { activeOnly: true }),
      listProductsByEntity(supabase, entity.id, { limit: 60 }),
      listProductCategories(supabase, entity.id),
      listUpcomingEventsForOwner(supabase, entity.id),
    ])

  const [productReviewStats, serviceReviewStats, eventRegistrationCounts] = await Promise.all([
    Promise.all(
      products.map((p) => getReviewAggregates(supabase, p.id).catch(() => ({ count: 0, average: 0 })))
    ),
    Promise.all(
      appointmentTypes.map((s) =>
        getServiceReviewAggregates(supabase, s.id).catch(() => ({ count: 0, average: 0 }))
      )
    ),
    Promise.all(
      upcomingEvents.map((ev) =>
        ev.capacity != null
          ? countEventRegistrations(supabase, ev.id).catch(() => 0)
          : Promise.resolve(0)
      )
    ),
  ])

  return {
    publications,
    shopProducts: products.map((p, i) => ({
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
    })),
    productCategories,
    playlistServices: appointmentTypes.map((s, i) => ({
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
    })),
    playlistEvents: upcomingEvents.map((ev, i) => ({
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
      registrations_count: eventRegistrationCounts[i],
      image_url: ev.gallery_images?.[0] ?? null,
      image_urls: [...(ev.gallery_images ?? [])].filter(Boolean),
    })),
  }
}

export async function loadProfileStudioData() {
  const [shell, playlists] = await Promise.all([
    loadProfileStudioShell(),
    loadProfileStudioPlaylists(),
  ])
  if (!shell || !playlists) return null
  return { ...shell, ...playlists }
}

export type ProfileStudioShellData = NonNullable<Awaited<ReturnType<typeof loadProfileStudioShell>>>
export type ProfileStudioPlaylistsData = NonNullable<
  Awaited<ReturnType<typeof loadProfileStudioPlaylists>>
>
export type ProfileStudioData = ProfileStudioShellData & ProfileStudioPlaylistsData
