'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircle,
  Mic,
  Paperclip,
  PanelsTopLeft,
} from 'lucide-react'
import { useMessagesComposer } from './messages/MessagesComposerContext'
import type { MessagesComposerSlot } from './messages/MessagesComposerContext'

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  isActive?: boolean
  external?: boolean
}

type PillMode = 'composer' | 'nav'

interface Props {
  webProfileUrl: string
  webProfileActive: boolean
  currentPath?: string
  isAuthenticated?: boolean
  loginUrl?: string
}

function ComposerPill({
  slot,
  onClose,
  className,
}: {
  slot: MessagesComposerSlot
  onClose?: () => void
  className?: string
}) {
  return (
    <div
      className={`navpill navpill--composer${onClose ? ' navpill--with-nav-back' : ''}${className ? ` ${className}` : ''} navpill--composer-fluid`}
      role="group"
      aria-label="Écrire un message"
    >
      {onClose ? (
        <>
          <button
            type="button"
            className="navpill__compose-toggle navpill__compose-toggle--back"
            onClick={onClose}
            aria-label="Afficher la navigation"
          >
            <ChevronLeft className="navpill__compose-chevron" aria-hidden="true" />
            <span className="navpill__compose-label">Navigation</span>
          </button>
          <span className="navpill__divider" aria-hidden="true" />
        </>
      ) : null}
      <div className="navpill-composer__field">
        <button
          type="button"
          className="navpill-composer__input-attach"
          disabled
          title="Bientôt"
          aria-label="Ajouter un document"
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          type="text"
          className="navpill-composer__input"
          placeholder={slot.placeholder ?? 'Ecris ton message'}
          value={slot.draft}
          onChange={(e) => slot.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              slot.send()
            }
          }}
          disabled={slot.pending}
          aria-label="Message"
        />
        <button
          type="button"
          className="navpill-composer__input-mic"
          disabled
          title="Bientôt"
          aria-label="Message vocal"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="navpill-composer__send"
          aria-label="Envoyer"
          onClick={slot.send}
          disabled={slot.pending || !slot.canSend}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function FloatingNavPill({
  webProfileUrl,
  webProfileActive,
  currentPath = '/',
  isAuthenticated = true,
  loginUrl = '/login',
}: Props) {
  const router = useRouter()
  const composerCtx = useMessagesComposer()
  const [pillMode, setPillMode] = useState<PillMode>('composer')
  const hadComposerSlot = useRef(false)

  const profileHref = isAuthenticated ? webProfileUrl : loginUrl
  const onMessages = currentPath.startsWith('/dashboard/messages')
  const composerSlot = onMessages ? composerCtx?.slot : null

  useEffect(() => {
    if (composerSlot && !hadComposerSlot.current) {
      setPillMode('composer')
    }
    hadComposerSlot.current = Boolean(composerSlot)
  }, [composerSlot])

  const items: NavItem[] = [
    {
      href: '/',
      label: 'Home',
      icon: <Home className="h-5 w-5" aria-hidden="true" />,
      isActive: currentPath === '/',
    },
    {
      href: '/dashboard/messages',
      label: 'Message',
      icon: <MessageCircle className="h-5 w-5" aria-hidden="true" />,
      isActive: onMessages,
    },
    {
      href: '/dashboard/activite',
      label: 'Activité',
      icon: <Activity className="h-5 w-5" aria-hidden="true" />,
      isActive:
        (currentPath.startsWith('/dashboard/activite') &&
          !currentPath.startsWith('/dashboard/activite/revenus')) ||
        currentPath.startsWith('/notifications'),
    },
    {
      href: profileHref,
      label: 'Profile web',
      icon: <PanelsTopLeft className="h-5 w-5" aria-hidden="true" />,
      isActive: webProfileActive,
    },
  ]

  function renderNavItem(item: NavItem) {
    const className = `navpill__btn${item.isActive ? ' is-active' : ''}`

    if (item.external || item.href.startsWith('#')) {
      return (
        <a
          key={item.label}
          href={item.href}
          aria-label={item.label}
          aria-current={item.isActive ? 'page' : undefined}
          className={className}
        >
          {item.icon}
        </a>
      )
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        prefetch
        aria-label={item.label}
        aria-current={item.isActive ? 'page' : undefined}
        className={className}
        onMouseEnter={() => router.prefetch(item.href)}
      >
        {item.icon}
      </Link>
    )
  }

  if (composerSlot) {
    return (
      <div
        className={`navpill-shell${pillMode === 'composer' ? ' navpill-shell--message-compose' : ''}`}
      >
        {composerSlot.error ? (
          <p className="navpill-shell__error" role="alert">
            {composerSlot.error}
          </p>
        ) : null}
        {pillMode === 'composer' ? (
          <ComposerPill slot={composerSlot} onClose={() => setPillMode('nav')} />
        ) : (
          <nav className="navpill navpill--with-compose-toggle" aria-label="Navigation rapide">
            <div className="navpill__nav-cluster">{items.map(renderNavItem)}</div>
            <span className="navpill__divider" aria-hidden="true" />
            <button
              type="button"
              className="navpill__compose-toggle"
              onClick={() => setPillMode('composer')}
              aria-label="Écrire un message"
            >
              <span className="navpill__compose-label">Message</span>
              <ChevronRight className="navpill__compose-chevron" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    )
  }

  return (
    <div className="navpill-shell">
      <nav className="navpill" aria-label="Navigation rapide">
        {items.map(renderNavItem)}
      </nav>
    </div>
  )
}
