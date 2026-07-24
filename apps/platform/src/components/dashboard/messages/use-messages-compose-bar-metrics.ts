'use client'

import { useEffect } from 'react'

function clearComposeBarMetrics() {
  document.documentElement.removeAttribute('data-messages-compose-bar')
  document.documentElement.style.removeProperty('--messages-compose-bar-max-width')
  document.documentElement.style.removeProperty('--messages-compose-bar-center-x')
}

function syncComposeBarMetrics() {
  const chat = document.querySelector('.messages-chat')
  if (!chat) {
    clearComposeBarMetrics()
    return
  }

  const rect = chat.getBoundingClientRect()
  if (rect.width <= 0) return

  document.documentElement.setAttribute('data-messages-compose-bar', 'true')
  document.documentElement.style.setProperty(
    '--messages-compose-bar-max-width',
    `${Math.round(rect.width)}px`,
  )
  document.documentElement.style.setProperty(
    '--messages-compose-bar-center-x',
    `${Math.round(rect.left + rect.width / 2)}px`,
  )
}

export function useMessagesComposeBarMetrics(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      clearComposeBarMetrics()
      return
    }

    syncComposeBarMetrics()

    const chat = document.querySelector('.messages-chat')
    if (!chat) return

    const observer = new ResizeObserver(syncComposeBarMetrics)
    observer.observe(chat)
    window.addEventListener('resize', syncComposeBarMetrics)
    window.addEventListener('scroll', syncComposeBarMetrics, true)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncComposeBarMetrics)
      window.removeEventListener('scroll', syncComposeBarMetrics, true)
      clearComposeBarMetrics()
    }
  }, [enabled])
}
