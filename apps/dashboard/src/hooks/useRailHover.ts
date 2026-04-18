'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export function useRailHover() {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocusWithin, setIsFocusWithin] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const onMouseEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
    const delay = reducedMotion.current ? 0 : 150
    enterTimer.current = setTimeout(() => setIsHovered(true), delay)
  }, [])

  const onMouseLeave = useCallback(() => {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null }
    const delay = reducedMotion.current ? 0 : 300
    leaveTimer.current = setTimeout(() => setIsHovered(false), delay)
  }, [])

  const onFocusCapture = useCallback(() => setIsFocusWithin(true), [])
  const onBlurCapture = useCallback(() => {
    requestAnimationFrame(() => {
      const rail = document.querySelector('[data-main-rail]')
      if (rail && !rail.contains(document.activeElement)) {
        setIsFocusWithin(false)
      }
    })
  }, [])

  useEffect(() => {
    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, [])

  return {
    isExpanded: isHovered || isFocusWithin,
    railProps: { onMouseEnter, onMouseLeave, onFocusCapture, onBlurCapture },
  }
}
