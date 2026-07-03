'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type MessagesComposerSlot = {
  draft: string
  setDraft: (value: string) => void
  send: () => void
  pending: boolean
  canSend: boolean
  error: string | null
  placeholder?: string
}

type ContextValue = {
  slot: MessagesComposerSlot | null
  setSlot: (slot: MessagesComposerSlot | null) => void
}

const MessagesComposerContext = createContext<ContextValue | null>(null)

function slotsEqual(
  a: MessagesComposerSlot | null,
  b: MessagesComposerSlot | null
): boolean {
  if (a === b) return true
  if (!a || !b) return false

  return (
    a.draft === b.draft &&
    a.pending === b.pending &&
    a.canSend === b.canSend &&
    a.error === b.error &&
    a.placeholder === b.placeholder &&
    a.setDraft === b.setDraft &&
    a.send === b.send
  )
}

export function MessagesComposerProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotState] = useState<MessagesComposerSlot | null>(null)

  const setSlot = useCallback((next: MessagesComposerSlot | null) => {
    setSlotState((prev) => (slotsEqual(prev, next) ? prev : next))
  }, [])

  const value = useMemo(() => ({ slot, setSlot }), [slot, setSlot])

  return (
    <MessagesComposerContext.Provider value={value}>{children}</MessagesComposerContext.Provider>
  )
}

export function useMessagesComposer() {
  return useContext(MessagesComposerContext)
}

export function useMessagesComposerSetSlot() {
  return useContext(MessagesComposerContext)?.setSlot
}
