'use client'

import '@ibee/ui-react/home-activity-sidebar.css'
import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Bell, CalendarClock, ShoppingBag, Ticket } from 'lucide-react'
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/dashboard/notification-actions'
import type { HeaderNotification } from '@/components/dashboard/GlobalHeader'
import type { ActivityHubSignals } from '@ibee/supabase'
import type { ActivityCapabilitiesView } from '@/lib/activity-modules'
import {
  formatNotificationDate,
  getNotificationText,
  getNotificationUrl,
} from '@/lib/notification-display'
import { DashboardNavLink } from '../DashboardNavLink'
import { MainRail } from '../MainRail'

type ActivityHubResponse = {
  signals: Partial<ActivityHubSignals>
  capabilities: ActivityCapabilitiesView
  unreadCount: number
  notifications: HeaderNotification[]
}

const SIGNAL_ITEMS = [
  { key: 'orders' as const, capability: 'shop' as const, label: 'Achats', icon: ShoppingBag },
  {
    key: 'bookings' as const,
    capability: 'appointments' as const,
    label: 'Rendez-vous',
    icon: CalendarClock,
  },
  {
    key: 'registrations' as const,
    capability: 'events' as const,
    label: 'Réservations',
    icon: Ticket,
  },
]

function formatBadge(count: number) {
  if (count <= 0) return null
  if (count > 99) return '99+'
  return String(count)
}

export function HomeActivitySidebar() {
  const [data, setData] = useState<ActivityHubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const loadHub = useCallback(async () => {
    try {
      const res = await fetch('/api/home/activity-hub')
      if (!res.ok) {
        setData(null)
        return
      }
      const json = (await res.json()) as ActivityHubResponse
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHub()
    const onFocus = () => void loadHub()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadHub])

  function handleNotifClick(notificationId: string, readAt: string | null) {
    if (readAt) return
    startTransition(async () => {
      await markNotificationReadAction(notificationId)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        }
      })
    })
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction()
      setData((prev) => {
        if (!prev) return prev
        const now = new Date().toISOString()
        return {
          ...prev,
          unreadCount: 0,
          notifications: prev.notifications.map((n) => ({ ...n, read_at: n.read_at ?? now })),
        }
      })
    })
  }

  return (
    <MainRail ariaLabel="Centre d'activité">
      <div className="sidebar-nav__body home-activity-sidebar">
        <div className="home-activity-sidebar__section">
          <div className="home-activity-sidebar__signals">
            {SIGNAL_ITEMS.filter(
              (item) => !data?.capabilities || data.capabilities[item.capability],
            ).map(({ key, label, icon: Icon }) => {
              const signal = data?.signals[key]
              const badge = formatBadge(signal?.count ?? 0)
              return (
                <DashboardNavLink
                  key={key}
                  href={signal?.href ?? '#'}
                  className="home-activity-sidebar__signal"
                  label={label}
                >
                  <span className="home-activity-sidebar__signal-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="home-activity-sidebar__signal-label">{label}</span>
                  {badge ? (
                    <span className="home-activity-sidebar__signal-badge">{badge}</span>
                  ) : (
                    <span className="home-activity-sidebar__signal-badge is-muted">0</span>
                  )}
                </DashboardNavLink>
              )
            })}
          </div>
        </div>

        <div className="home-activity-sidebar__section home-activity-sidebar__section--feed">
          <div className="home-activity-sidebar__feed-head">
            <p className="sidebar__label">Activité</p>
            {data && data.unreadCount > 0 ? (
              <button
                type="button"
                className="home-activity-sidebar__mark-all"
                disabled={pending}
                onClick={handleMarkAllRead}
              >
                Tout lu
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="home-activity-sidebar__empty">Chargement…</div>
          ) : !data || data.notifications.length === 0 ? (
            <div className="home-activity-sidebar__empty">
              <Bell className="home-activity-sidebar__empty-icon" aria-hidden="true" />
              <p>Pas d&apos;activité récente</p>
            </div>
          ) : (
            <ul className="home-activity-sidebar__list">
              {data.notifications.map((n) => {
                const actorInitial = n.actor_entity?.display_name?.charAt(0).toUpperCase() ?? '?'
                return (
                  <li key={n.id}>
                    <Link
                      href={getNotificationUrl(n)}
                      className={`home-activity-sidebar__notif${n.read_at ? '' : ' is-unread'}`}
                      onClick={() => handleNotifClick(n.id, n.read_at)}
                    >
                      <span className="home-activity-sidebar__notif-avatar" aria-hidden="true">
                        {n.actor_entity?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={n.actor_entity.avatar_url} alt="" />
                        ) : (
                          <span>{actorInitial}</span>
                        )}
                      </span>
                      <span className="home-activity-sidebar__notif-body">
                        <span className="home-activity-sidebar__notif-text">
                          {getNotificationText(n)}
                        </span>
                        <span className="home-activity-sidebar__notif-date">
                          {formatNotificationDate(n.created_at)}
                        </span>
                      </span>
                      {!n.read_at ? (
                        <span className="home-activity-sidebar__notif-dot" aria-hidden="true" />
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </MainRail>
  )
}
