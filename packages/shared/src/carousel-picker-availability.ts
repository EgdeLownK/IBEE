import type { CarouselSelectionMode } from './carousel-items'
import { carouselSelectionModesForSource } from './carousel-items'
import type { CarouselSourceKind, HighlightContentKind } from './home-widget-config'
import { CAROUSEL_SOURCE_KINDS } from './home-widget-config'

export type WidgetConfigPickerData = {
  products: readonly { category_id?: string | null }[]
  categories: readonly { id: string; name: string }[]
  services: readonly unknown[]
  events: readonly unknown[]
  publications: readonly unknown[]
}

const HIGHLIGHT_KINDS: HighlightContentKind[] = ['product', 'service', 'event', 'news']

export const CAROUSEL_SOURCE_EMPTY_LABELS: Record<CarouselSourceKind, string> = {
  shop_category: 'Aucun produit',
  services: 'Aucun service',
  events: 'Aucun événement à venir',
  news: 'Aucune publication',
}

export function highlightKindHasContent(
  kind: HighlightContentKind,
  data: WidgetConfigPickerData
): boolean {
  switch (kind) {
    case 'product':
      return data.products.length > 0
    case 'service':
      return data.services.length > 0
    case 'event':
      return data.events.length > 0
    case 'news':
      return data.publications.length > 0
  }
}

export function carouselSourceHasContent(
  sourceKind: CarouselSourceKind,
  data: WidgetConfigPickerData
): boolean {
  switch (sourceKind) {
    case 'shop_category':
      return data.products.length > 0
    case 'services':
      return data.services.length > 0
    case 'events':
      return data.events.length > 0
    case 'news':
      return data.publications.length > 0
  }
}

export function categoryIdsWithProducts(data: WidgetConfigPickerData): Set<string> {
  return new Set(
    data.products
      .map((p) => p.category_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  )
}

export function categoriesWithProducts(data: WidgetConfigPickerData) {
  const ids = categoryIdsWithProducts(data)
  return data.categories.filter((c) => ids.has(c.id))
}

export function carouselSelectionModeHasContent(
  sourceKind: CarouselSourceKind,
  mode: CarouselSelectionMode,
  data: WidgetConfigPickerData
): boolean {
  if (sourceKind === 'shop_category') {
    if (mode === 'category') {
      return categoriesWithProducts(data).length > 0
    }
    return data.products.length > 0
  }
  if (sourceKind === 'services') {
    return data.services.length > 0
  }
  return false
}

export function firstAvailableCarouselSource(
  data: WidgetConfigPickerData
): CarouselSourceKind | null {
  return CAROUSEL_SOURCE_KINDS.find((kind) => carouselSourceHasContent(kind, data)) ?? null
}

export function firstAvailableCarouselSelectionMode(
  sourceKind: CarouselSourceKind,
  data: WidgetConfigPickerData
): CarouselSelectionMode | null {
  const modes = carouselSelectionModesForSource(sourceKind)
  if (!modes) return null
  return modes.find((mode) => carouselSelectionModeHasContent(sourceKind, mode, data)) ?? null
}

export function firstAvailableHighlightKind(data: WidgetConfigPickerData): HighlightContentKind | null {
  return HIGHLIGHT_KINDS.find((kind) => highlightKindHasContent(kind, data)) ?? null
}
