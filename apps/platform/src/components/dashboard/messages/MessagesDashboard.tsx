'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MessagesDashboardData } from '@/lib/load-messages-data'
import { MessagesChatPanel } from './MessagesChatPanel'
import { MessagesContactList } from './MessagesContactList'
import { MessagesContextPanel } from './MessagesContextPanel'
import { useMessagesCompactLayout } from './use-messages-compact-layout'
import { useMessagesComposeBarMetrics } from './use-messages-compose-bar-metrics'

type MobileView = 'list' | 'chat'

type Props = {
  data: MessagesDashboardData
}

export function MessagesDashboard({ data }: Props) {
  const compact = useMessagesCompactLayout()
  const [search, setSearch] = useState('')
  const [mobileView, setMobileView] = useState<MobileView>('list')
  const [contextOpen, setContextOpen] = useState(false)
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null)

  useEffect(() => {
    if (compact) return
    if (selectedThreadKey !== null) return
    const first = data.threads[0]?.threadKey
    if (first) setSelectedThreadKey(first)
  }, [compact, data.threads, selectedThreadKey])

  useEffect(() => {
    if (!compact) {
      setMobileView('list')
      setContextOpen(false)
    }
  }, [compact])

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data.threads
    return data.threads.filter(
      (t) =>
        t.contactName.toLowerCase().includes(q) ||
        t.contactEmail.toLowerCase().includes(q) ||
        t.lastPreview.toLowerCase().includes(q)
    )
  }, [data.threads, search])

  const selectedThread =
    data.threads.find((t) => t.threadKey === selectedThreadKey) ??
    (compact ? null : filteredThreads[0] ?? null)

  const composerVisible = Boolean(selectedThread && (!compact || mobileView === 'chat'))

  useMessagesComposeBarMetrics(composerVisible)

  function handleSelectThread(threadKey: string) {
    setSelectedThreadKey(threadKey)
    setContextOpen(false)
    if (compact) setMobileView('chat')
  }

  function handleBackToList() {
    setContextOpen(false)
    setMobileView('list')
  }

  function handleOpenContext() {
    setContextOpen(true)
  }

  function handleCloseContext() {
    setContextOpen(false)
  }

  return (
    <div
      className="messages-page"
      data-view={compact ? mobileView : 'desktop'}
      data-context-open={compact && contextOpen ? 'true' : 'false'}
      data-composer-active={composerVisible ? 'true' : 'false'}
    >
      <MessagesContactList
        threads={filteredThreads}
        selectedThreadKey={selectedThread?.threadKey ?? null}
        search={search}
        onSearchChange={setSearch}
        onSelect={handleSelectThread}
      />
      <MessagesChatPanel
        thread={selectedThread}
        compact={compact}
        composerEnabled={composerVisible}
        onBack={handleBackToList}
        onOpenContext={handleOpenContext}
      />
      <MessagesContextPanel
        thread={selectedThread}
        compact={compact}
        open={contextOpen}
        onClose={handleCloseContext}
      />
    </div>
  )
}
