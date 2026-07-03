'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 1099px)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useMessagesCompactLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useMessagesDesktopLayout() {
  return !useMessagesCompactLayout()
}
