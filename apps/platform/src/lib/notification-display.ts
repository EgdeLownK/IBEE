import type { HeaderNotification } from '@/components/dashboard/GlobalHeader'

export function formatNotificationDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (diffMs < sevenDays) {
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 60) return rtf.format(-diffMin, 'minute')
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24) return rtf.format(-diffH, 'hour')
    return rtf.format(-Math.round(diffH / 24), 'day')
  }
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date)
}

export function getNotificationText(n: HeaderNotification) {
  const name = n.actor_entity?.display_name ?? "Quelqu'un"
  if (n.type === 'new_follower') return `${name} vous suit`
  if (n.type === 'new_publication') return `${name} a publié une news`
  if (n.type === 'new_comment') return `${name} a commenté`
  return `${name} a interagi`
}

export function getNotificationUrl(n: HeaderNotification) {
  if (n.type === 'new_follower' && n.actor_entity) {
    return `/${n.actor_entity.slug}`
  }
  if (n.type === 'new_publication' && n.actor_entity && n.target_publication?.slug) {
    return `/${n.actor_entity.slug}/news/${n.target_publication.slug}`
  }
  return '/notifications'
}
