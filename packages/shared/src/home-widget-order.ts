import {
  normalizeWidgetConfig,
  parseEventConfig,
  parseServiceConfig,
  parseShopConfig,
} from './home-widget-config'

/** Types masqués sur l'accueil (legacy ou retirés). */
export const HIDDEN_HOME_WIDGET_TYPES = new Set(['widget_history', 'widget_announcement'])

/** Ordre fixe studio / public : mise en avant → carrousels → FAQ → bio. */
export const HOME_WIDGET_FIXED_TIERS = {
  highlight: 0,
  carousel: 1,
  faq: 2,
  bio: 3,
} as const

export function homeWidgetSortTier(type: string, config?: unknown): number {
  const normalized = normalizeWidgetConfig(config)

  if (type === 'widget_highlight') return HOME_WIDGET_FIXED_TIERS.highlight
  if (type === 'widget_carousel') return HOME_WIDGET_FIXED_TIERS.carousel
  if (type === 'widget_faq') return HOME_WIDGET_FIXED_TIERS.faq
  if (type === 'widget_bio') return HOME_WIDGET_FIXED_TIERS.bio

  if (type === 'widget_shop') {
    return parseShopConfig(normalized)?.mode === 'product'
      ? HOME_WIDGET_FIXED_TIERS.highlight
      : HOME_WIDGET_FIXED_TIERS.carousel
  }
  if (type === 'widget_service') {
    return parseServiceConfig(normalized)?.mode === 'service'
      ? HOME_WIDGET_FIXED_TIERS.highlight
      : HOME_WIDGET_FIXED_TIERS.carousel
  }
  if (type === 'widget_event') {
    return parseEventConfig(normalized)?.mode === 'featured'
      ? HOME_WIDGET_FIXED_TIERS.highlight
      : HOME_WIDGET_FIXED_TIERS.carousel
  }
  if (type === 'widget_news') return HOME_WIDGET_FIXED_TIERS.carousel

  return 99
}

export function isVisibleHomeWidget(type: string): boolean {
  return !HIDDEN_HOME_WIDGET_TYPES.has(type)
}

export function sortHomeWidgetsByFixedOrder<
  T extends { type: string; config?: unknown; position: number },
>(widgets: T[]): T[] {
  return [...widgets]
    .filter((w) => isVisibleHomeWidget(w.type))
    .sort((a, b) => {
      const tierA = homeWidgetSortTier(a.type, a.config)
      const tierB = homeWidgetSortTier(b.type, b.config)
      if (tierA !== tierB) return tierA - tierB
      return a.position - b.position
    })
}
