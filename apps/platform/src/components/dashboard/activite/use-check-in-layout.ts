'use client'

import { useEffect, useState } from 'react'
import { CHECK_IN_MOBILE_MEDIA_QUERY } from '@/lib/check-in-layout'

export function useCheckInMobileLayout(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(CHECK_IN_MOBILE_MEDIA_QUERY)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}
