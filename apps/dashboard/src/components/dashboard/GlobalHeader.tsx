'use client'

import { useState } from 'react'
import { Menu, Link2, Clipboard, Check, Bell, Settings, UserCircle, Shield, HelpCircle } from 'lucide-react'

type Props = {
  profileUrl?: string
  avatarUrl?: string | null
  displayName?: string | null
  unreadCount?: number
  webUrl?: string
}

export function GlobalHeader({ profileUrl, avatarUrl, displayName, unreadCount = 0, webUrl = '' }: Props) {
  const [copied, setCopied] = useState(false)
  const displayUrl = profileUrl ? profileUrl.replace(/^https?:\/\//, '') : null
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?'
  const menuId = 'dashboard-avatar-menu'

  function formatBadge(n: number): string {
    if (n > 99) return '99+'
    return String(n)
  }

  function handleOpenDrawer() {
    const el = document.documentElement
    el.setAttribute('data-drawer-open', el.getAttribute('data-drawer-open') === 'true' ? 'false' : 'true')
  }

  async function handleCopy() {
    if (!profileUrl) return
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[copy]', err)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-0 px-4">
      {/* Gauche — Hamburger (mobile) + URL (desktop) */}
      <div className="flex items-center gap-2">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Copy URL — mobile: pill button, desktop: URL + icon */}
        {displayUrl && profileUrl && (
          <>
            {/* Mobile — pill "Copier l'URL" */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 md:hidden"
              aria-label="Copier l'URL de mon profil public"
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              <span>{copied ? 'URL copiée !' : "Copier l'URL"}</span>
            </button>

            {/* Desktop — URL + copy button */}
            <div className="hidden items-center gap-2 md:flex">
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate max-w-[300px] text-sm text-neutral-600 transition-colors hover:text-neutral-900"
              >
                {displayUrl}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                aria-label="Copier l'URL"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Droite — Cloche + Avatar */}
      <div className="flex items-center gap-2">
        {/* Paramètres */}
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 cursor-default"
          aria-label="Paramètres"
          title="Paramètres"
        >
          <Settings className="h-5 w-5" />
        </span>

        {/* Notification bell */}
        <a
          href={`${webUrl}/notifications`}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {formatBadge(unreadCount)}
            </span>
          )}
        </a>

        {/* Avatar menu */}
        <button
          type="button"
          popoverTarget={menuId}
          style={{ anchorName: `--${menuId}` } as React.CSSProperties}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full transition hover:ring-2 hover:ring-neutral-200"
        >
          {avatarUrl ? (
            // Avatar 36px hors-viewport initial : next/image n'apporte rien ici et impose une config remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName ?? ''} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-accent-soft text-sm font-semibold text-accent">
              {initial}
            </span>
          )}
        </button>

        <div
          id={menuId}
          popover="auto"
          className="dashboard-avatar-menu"
          style={{ positionAnchor: `--${menuId}` } as React.CSSProperties}
        >
          <a href="/account" className="dashboard-avatar-menu-item">
            <UserCircle className="h-5 w-5 shrink-0" />
            <span>Mon compte</span>
          </a>
          <div className="dashboard-avatar-menu-item dashboard-avatar-menu-item--disabled">
            <Shield className="h-5 w-5 shrink-0" />
            <span className="flex-1">Confidentialité</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-400">
              Bientôt
            </span>
          </div>
          <div className="dashboard-avatar-menu-item dashboard-avatar-menu-item--disabled">
            <HelpCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1">Aide</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-400">
              Bientôt
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
