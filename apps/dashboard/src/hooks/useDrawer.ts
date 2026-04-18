'use client'

import { useState, useEffect, useCallback } from 'react'

export function useDrawer() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDrawerOpen(document.documentElement.getAttribute('data-drawer-open') === 'true')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-drawer-open'] })

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        document.documentElement.setAttribute('data-drawer-open', 'false')
      }
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const openDrawer = useCallback(() => {
    document.documentElement.setAttribute('data-drawer-open', 'true')
  }, [])

  const closeDrawer = useCallback(() => {
    document.documentElement.setAttribute('data-drawer-open', 'false')
  }, [])

  return { isDrawerOpen, openDrawer, closeDrawer }
}
