'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell, BookOpen, ChevronDown, LogOut, Menu, Sun, UserCircle } from 'lucide-react'
import { logout } from '@/app/dashboard/actions'
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/dashboard/notification-actions'
import { toggleAppDrawer } from './GlobalSidebar'

export type HeaderNotification = {
  id: string
  type: string
  read_at: string | null
  created_at: string
  target_publication_id: string | null
  actor_entity: {
    id: string
    display_name: string
    avatar_url: string | null
    slug: string
  } | null
  target_publication: { slug: string } | null
}

interface Props {
  projectLabel?: string | null
  webUrl: string
  webProfileUrl?: string
  avatarUrl?: string | null
  displayName?: string
  slug?: string
  unreadCount?: number
  notifications?: HeaderNotification[]
  isAuthenticated?: boolean
  loginUrl?: string
}

function formatBadge(n: number) {
  if (n > 99) return '99+'
  return String(n)
}

function formatNotifDate(dateStr: string) {
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

function getNotifText(n: HeaderNotification) {
  const name = n.actor_entity?.display_name ?? "Quelqu'un"
  if (n.type === 'new_follower') return `${name} vous suit`
  if (n.type === 'new_publication') return `${name} a publié une news`
  return `${name} a interagi`
}

function getNotifUrl(n: HeaderNotification) {
  if (n.type === 'new_follower' && n.actor_entity) {
    return `/${n.actor_entity.slug}`
  }
  if (n.type === 'new_publication' && n.actor_entity && n.target_publication?.slug) {
    return `/${n.actor_entity.slug}/news/${n.target_publication.slug}`
  }
  return '/notifications'
}

export function GlobalHeader({
  projectLabel,
  webUrl,
  webProfileUrl = '/',
  avatarUrl = null,
  displayName = '',
  slug = '',
  unreadCount: initialUnread = 0,
  notifications = [],
  isAuthenticated = true,
  loginUrl = '/login',
}: Props) {
  const [clock, setClock] = useState('--:--')
  const [unreadCount, setUnreadCount] = useState(initialUnread)
  const [pending, startTransition] = useTransition()

  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?'
  const avatarMenuId = 'header-avatar-menu'
  const notifPopoverId = 'header-notif-popover'

  useEffect(() => {
    setUnreadCount(initialUnread)
  }, [initialUnread])

  useEffect(() => {
    function tick() {
      const d = new Date()
      setClock(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      )
    }
    tick()
    const id = window.setInterval(tick, 30000)
    return () => window.clearInterval(id)
  }, [])

  function handleMarkAllRead() {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction()
      if (res.ok) setUnreadCount(0)
    })
  }

  function handleNotifClick(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id)
      setUnreadCount((c) => Math.max(0, c - 1))
    })
  }

  return (
    <header className="app-header">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAppDrawer}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-panel min-[1200px]:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {projectLabel && (
          <button type="button" className="app-header__project">
            <span className="truncate max-w-[200px] min-[1200px]:max-w-[280px]">{projectLabel}</span>
            <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          </button>
        )}
      </div>

      <a href="/" className="app-header__brand" aria-label="Accueil IBEE">
        IBEE<sup>v0.4</sup>
      </a>

      <div className="app-header__right">
        <div className="app-header__weather hidden md:inline-flex" aria-label="Météo">
          <Sun className="h-4 w-4" aria-hidden="true" />
          <span className="app-header__weather-temp">21°</span>
        </div>

        <span className="app-header__time hidden md:inline">{clock}</span>

        {isAuthenticated ? (
          <>
            <a
              href="/notifications"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-panel md:hidden"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {formatBadge(unreadCount)}
                </span>
              )}
            </a>

            <button
          type="button"
          popoverTarget={notifPopoverId}
          style={{ anchorName: `--${notifPopoverId}` } as React.CSSProperties}
          className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-panel md:flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {formatBadge(unreadCount)}
            </span>
          )}
        </button>

        <div
          id={notifPopoverId}
          popover="auto"
          className="notif-popover"
          style={{ positionAnchor: `--${notifPopoverId}` } as React.CSSProperties}
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="text-base font-semibold text-neutral-900">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={handleMarkAllRead}
                className="text-xs font-medium uppercase tracking-wide text-accent transition hover:text-accent-hover"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-2 text-neutral-400">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm text-neutral-400">Pas de notifications</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.map((n) => {
                const actorInitial = n.actor_entity?.display_name?.charAt(0).toUpperCase() ?? '?'
                return (
                  <a
                    key={n.id}
                    href={getNotifUrl(n)}
                    onClick={() => {
                      if (!n.read_at) handleNotifClick(n.id)
                    }}
                    className="notif-item flex items-center gap-3 px-4 py-3 transition hover:bg-panel"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
                      {n.actor_entity?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.actor_entity.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-accent">{actorInitial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-900">{getNotifText(n)}</p>
                      <p className="text-xs text-neutral-400">{formatNotifDate(n.created_at)}</p>
                    </div>
                    {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </a>
                )
              })}
            </div>
          )}

          {notifications.length > 0 && (
            <div className="border-t border-neutral-100 px-4 py-2.5 text-center">
              <a
                href="/notifications"
                className="text-xs font-medium text-accent transition hover:text-accent-hover"
              >
                Afficher tout
              </a>
            </div>
          )}
        </div>

        <button
          type="button"
          popoverTarget={avatarMenuId}
          style={{ anchorName: `--${avatarMenuId}` } as React.CSSProperties}
          className="app-header__avatar"
          aria-label="Mon compte"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {initial}
            </span>
          )}
        </button>

        <div
          id={avatarMenuId}
          popover="auto"
          className="app-menu"
          style={{ positionAnchor: `--${avatarMenuId}` } as React.CSSProperties}
        >
          <div className="app-menu__profile">
            <div className="app-menu__avatar">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent">
                  {initial}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="app-menu__name truncate">{displayName}</p>
              <p className="app-menu__handle truncate text-xs text-neutral-500">@{slug}</p>
            </div>
          </div>

          <hr className="app-menu__divider" />

          <a href={webProfileUrl} className="app-menu__item">
            <UserCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Voir mon profil</span>
          </a>
          <a href="/explore" className="app-menu__item app-menu__item--soft">
            <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Explorer</span>
          </a>

          <hr className="app-menu__divider" />

          <form action={logout}>
            <button type="submit" className="app-menu__item app-menu__item--soft w-full text-left">
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Se déconnecter</span>
            </button>
          </form>
        </div>
          </>
        ) : (
          <a
            href={loginUrl}
            className="inline-flex items-center rounded-full border border-neutral-200 bg-surface px-4 py-1.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-panel-2"
          >
            Se connecter
          </a>
        )}
      </div>
    </header>
  )
}
