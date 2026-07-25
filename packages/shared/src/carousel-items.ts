import type { CarouselSourceKind, CarouselWidgetConfig } from './home-widget-config'

/** Tri du carrousel boutique / services (pas events ni news). */
export const CAROUSEL_SELECTION_MODES = ['category', 'popular', 'top_rated'] as const
export type CarouselSelectionMode = (typeof CAROUSEL_SELECTION_MODES)[number]

export function carouselSelectionModesForSource(
  sourceKind: CarouselSourceKind,
): CarouselSelectionMode[] | null {
  switch (sourceKind) {
    case 'shop_category':
      return ['category', 'popular', 'top_rated']
    case 'services':
      return ['popular', 'top_rated']
    default:
      return null
  }
}

/** Étape 2 du configurateur : shop et services uniquement. */
export function carouselSourceNeedsContentStep(sourceKind: CarouselSourceKind): boolean {
  return sourceKind === 'shop_category' || sourceKind === 'services'
}

export function parseCarouselSelectionMode(raw: unknown): CarouselSelectionMode | null {
  if (raw === 'category' || raw === 'popular' || raw === 'top_rated') return raw
  return null
}

export function defaultCarouselSelectionMode(
  sourceKind: CarouselSourceKind,
): CarouselSelectionMode | null {
  if (sourceKind === 'shop_category') return 'category'
  if (sourceKind === 'services') return 'popular'
  return null
}

type RatedItem = { reviewCount: number; reviewAverage: number }

export function sortByCarouselSelection<T extends RatedItem>(
  items: T[],
  mode: CarouselSelectionMode,
): T[] {
  const copy = [...items]
  if (mode === 'popular') {
    copy.sort((a, b) => b.reviewCount - a.reviewCount || b.reviewAverage - a.reviewAverage)
    return copy
  }
  if (mode === 'top_rated') {
    copy.sort((a, b) => {
      const aRated = a.reviewCount > 0
      const bRated = b.reviewCount > 0
      if (!aRated && !bRated) return 0
      if (!aRated) return 1
      if (!bRated) return -1
      return b.reviewAverage - a.reviewAverage || b.reviewCount - a.reviewCount
    })
    return copy
  }
  return copy
}

type ShopCarouselProduct = RatedItem & { category_id?: string | null }

export function resolveCarouselShopProducts<T extends ShopCarouselProduct>(
  products: T[],
  cfg: Pick<CarouselWidgetConfig, 'selection_mode' | 'category_id' | 'limit'>,
): T[] {
  const limit = cfg.limit ?? 6
  const mode = cfg.selection_mode ?? 'category'
  if (mode === 'category') {
    return products.filter((p) => p.category_id === cfg.category_id).slice(0, limit)
  }
  return sortByCarouselSelection(products, mode).slice(0, limit)
}

export function resolveCarouselServices<T extends RatedItem>(
  services: T[],
  cfg: Pick<CarouselWidgetConfig, 'selection_mode' | 'limit'>,
): T[] {
  const limit = cfg.limit ?? 6
  const mode = cfg.selection_mode ?? 'popular'
  return sortByCarouselSelection(services, mode).slice(0, limit)
}

type UpcomingEvent = { start_at: string }

/** Événements à venir uniquement, du plus proche au plus lointain. */
export function resolveCarouselUpcomingEvents<T extends UpcomingEvent>(
  events: T[],
  limit = 6,
): T[] {
  return [...events]
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
}

export const CAROUSEL_SELECTION_LABELS: Record<CarouselSelectionMode, string> = {
  category: 'Une catégorie',
  popular: 'Les plus populaires',
  top_rated: 'Les mieux notés',
}
