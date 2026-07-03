export const HOME_WIDGET_LABELS: Record<string, string> = {
  widget_highlight: 'Mise en avant',
  widget_carousel: 'Carrousel',
  widget_shop: 'Shop',
  widget_service: 'Service',
  widget_event: 'Event',
  widget_news: 'News',
  widget_bio: 'Bio',
  widget_faq: 'F.A.Q',
  widget_announcement: 'Bannière',
}

export function homeWidgetLabel(type: string): string {
  return HOME_WIDGET_LABELS[type] ?? type
}
