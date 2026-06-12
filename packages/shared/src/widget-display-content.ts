/** Indique si un widget Accueil a du contenu affichable (fond gris si false). */
import {
  isWidgetConfigured,
  normalizeWidgetConfig,
  parseAnnouncementConfig,
  parseBioConfig,
  parseEventConfig,
  parseFaqConfig,
  parseNewsConfig,
  parseServiceConfig,
  parseShopConfig,
} from './home-widget-config'

type ContactInfo = {
  contact_email: string | null
  contact_email_public: boolean
  contact_phone: string | null
  contact_phone_public: boolean
  message_enabled: boolean
  opening_hours_enabled: boolean
  opening_hours: { day_of_week: number }[]
}

export interface WidgetDisplayContext {
  products: { id: string; category_id?: string | null }[]
  appointmentTypes: { id: string }[]
  events: { id: string }[]
  publications: { published_at: string | null }[]
  faqItems: unknown[]
  contactInfo: ContactInfo | null
}

function hasBioContent(ci: ContactInfo | null): boolean {
  if (!ci) return false
  const showEmail = ci.contact_email_public && !!ci.contact_email?.trim()
  const showPhone = ci.contact_phone_public && !!ci.contact_phone?.trim()
  const showMessage = ci.message_enabled
  const hasHours = ci.opening_hours_enabled && (ci.opening_hours?.length ?? 0) > 0
  return showEmail || showPhone || showMessage || hasHours
}

export function widgetHasDisplayContent(
  widget: { type: string; config?: unknown },
  ctx: WidgetDisplayContext,
): boolean {
  const config = normalizeWidgetConfig(widget.config)
  if (!isWidgetConfigured(widget.type, config)) return false

  switch (widget.type) {
    case 'widget_shop': {
      const cfg = parseShopConfig(config)
      if (!cfg) return false
      if (cfg.mode === 'product') {
        return ctx.products.some((p) => p.id === cfg.product_id)
      }
      return ctx.products.some((p) => p.category_id === cfg.category_id)
    }
    case 'widget_service': {
      const cfg = parseServiceConfig(config)
      if (!cfg) return false
      if (cfg.mode === 'service') {
        return ctx.appointmentTypes.some((s) => s.id === cfg.appointment_type_id)
      }
      return ctx.appointmentTypes.length > 0
    }
    case 'widget_event': {
      const cfg = parseEventConfig(config)
      if (!cfg) return false
      if (cfg.mode === 'featured') {
        return ctx.events.some((e) => e.id === cfg.event_id)
      }
      return ctx.events.length > 0
    }
    case 'widget_announcement': {
      const ann = parseAnnouncementConfig(config)
      return !!(ann?.images?.length)
    }
    case 'widget_faq':
      parseFaqConfig(config)
      return ctx.faqItems.length > 0
    case 'widget_news':
      parseNewsConfig(config)
      return ctx.publications.some((p) => p.published_at)
    case 'widget_bio':
      parseBioConfig(config)
      return hasBioContent(ctx.contactInfo)
    default:
      return false
  }
}
