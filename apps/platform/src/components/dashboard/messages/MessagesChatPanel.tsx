'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileText } from 'lucide-react'
import type { EntityMessage, MessageThread } from '@ibee/supabase'
import { sendMessageReplyAction } from '@/app/dashboard/messages/messages-actions'
import { useMessagesComposerSetSlot } from './MessagesComposerContext'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDayLabel(date: Date): string {
  const today = new Date()
  if (isSameDay(date, today)) return "Aujourd'hui"
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

type TimelineItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; key: string; message: EntityMessage }

function buildTimeline(messages: EntityMessage[]): TimelineItem[] {
  const items: TimelineItem[] = []
  let lastDay: string | null = null

  for (const message of messages) {
    const date = new Date(message.created_at)
    const dayKey = date.toISOString().slice(0, 10)
    if (dayKey !== lastDay) {
      items.push({ type: 'day', key: `day-${dayKey}`, label: formatDayLabel(date) })
      lastDay = dayKey
    }
    items.push({ type: 'message', key: message.id, message })
  }

  return items
}

type Props = {
  thread: MessageThread | null
  compact?: boolean
  composerEnabled?: boolean
  onBack?: () => void
  onOpenContext?: () => void
}

export function MessagesChatPanel({
  thread,
  compact = false,
  composerEnabled = true,
  onBack,
  onOpenContext,
}: Props) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const setComposerSlot = useMessagesComposerSetSlot()
  const draftRef = useRef(draft)
  draftRef.current = draft

  const timeline = useMemo(
    () => (thread ? buildTimeline(thread.messages) : []),
    [thread]
  )

  const handleSend = useCallback(() => {
    if (!thread) return
    const body = draftRef.current.trim()
    if (!body || pending) return

    setError(null)
    startTransition(async () => {
      const result = await sendMessageReplyAction({
        threadKey: thread.threadKey,
        body,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft('')
      router.refresh()
    })
  }, [pending, router, thread])

  useEffect(() => {
    if (!thread) {
      setDraft('')
      setError(null)
    }
  }, [thread])

  useEffect(() => {
    if (!setComposerSlot) return

    if (!thread || !composerEnabled) {
      setComposerSlot(null)
      return
    }

    return () => setComposerSlot(null)
  }, [composerEnabled, setComposerSlot, thread])

  useEffect(() => {
    if (!setComposerSlot || !thread || !composerEnabled) return

    setComposerSlot({
      draft,
      setDraft,
      send: handleSend,
      pending,
      canSend: draft.trim().length > 0,
      error,
      placeholder: 'Ecris ton message',
    })
  }, [composerEnabled, draft, error, handleSend, pending, setComposerSlot, thread])

  if (!thread) {
    return (
      <section className="messages-chat messages-chat--empty" aria-label="Conversation">
        {compact ? (
          <header className="messages-chat__head messages-chat__head--empty">
            <button
              type="button"
              className="messages-chat__back"
              onClick={onBack}
              aria-label="Retour aux conversations"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
        ) : null}
        <div className="messages-chat__placeholder">
          <p>Sélectionne une conversation ou attends le premier message visiteur.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="messages-chat" aria-label={`Conversation avec ${thread.contactName}`}>
      <header className="messages-chat__head">
        {compact ? (
          <button
            type="button"
            className="messages-chat__back"
            onClick={onBack}
            aria-label="Retour aux conversations"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        <div className="messages-chat__contact">
          <span className="messages-chat__avatar" aria-hidden="true">
            {initials(thread.contactName)}
          </span>
          <div className="messages-chat__contact-meta">
            <div className="messages-chat__contact-top">
              <h1 className="messages-chat__name">{thread.contactName}</h1>
            </div>
            {thread.isClient ? <span className="messages-chat__badge">Client</span> : null}
          </div>
        </div>
        {compact ? (
          <button
            type="button"
            className="messages-chat__context-btn"
            onClick={onOpenContext}
            aria-label="Document"
          >
            <FileText className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="messages-chat__body">
        {timeline.map((item) => {
          if (item.type === 'day') {
            return (
              <div key={item.key} className="messages-chat__day">
                <span>{item.label}</span>
              </div>
            )
          }

          const outbound = item.message.direction === 'outbound'
          return (
            <div
              key={item.key}
              className={`messages-bubble-row${outbound ? ' is-outbound' : ' is-inbound'}`}
            >
              <div className={`messages-bubble${outbound ? ' is-outbound' : ' is-inbound'}`}>
                <p className="messages-bubble__text">{item.message.body}</p>
                <time className="messages-bubble__time" dateTime={item.message.created_at}>
                  {formatTime(item.message.created_at)}
                </time>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
