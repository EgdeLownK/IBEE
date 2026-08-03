'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useHorizontalCarousel(slideGap = 12, slideClass = 'carousel-slide') {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateNav = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setCanPrev(track.scrollLeft > 1)
    setCanNext(track.scrollLeft < max - 1)
  }, [])

  const slideStep = useCallback(() => {
    const track = trackRef.current
    if (!track) return slideGap
    const slide = track.querySelector(`.${slideClass}`) as HTMLElement | null
    const w = slide ? slide.getBoundingClientRect().width : track.clientWidth * 0.6
    return w + slideGap
  }, [slideGap, slideClass])

  const scrollPrev = useCallback(() => {
    trackRef.current?.scrollBy({ left: -slideStep(), behavior: 'smooth' })
  }, [slideStep])

  const scrollNext = useCallback(() => {
    trackRef.current?.scrollBy({ left: slideStep(), behavior: 'smooth' })
  }, [slideStep])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    track.addEventListener('scroll', updateNav)
    window.addEventListener('resize', updateNav)
    updateNav()

    let isDown = false
    let startX = 0
    let startScroll = 0

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      isDown = true
      startX = e.clientX
      startScroll = track.scrollLeft
      track.style.scrollSnapType = 'none'
      track.classList.add('is-grabbing')
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return
      track.scrollLeft = startScroll - (e.clientX - startX)
    }
    const endDrag = () => {
      if (!isDown) return
      isDown = false
      track.style.scrollSnapType = ''
      track.classList.remove('is-grabbing')
    }

    track.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    track.addEventListener('dragstart', (e) => e.preventDefault())

    return () => {
      track.removeEventListener('scroll', updateNav)
      window.removeEventListener('resize', updateNav)
      track.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [updateNav])

  return { trackRef, canPrev, canNext, scrollPrev, scrollNext }
}
