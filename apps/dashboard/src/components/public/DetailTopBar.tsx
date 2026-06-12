'use client'

import { ArrowLeft, Check, Share } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface Props {
  backHref: string
  title: string
}

export function DetailTopBar({ backHref, title }: Props) {
  const [shared, setShared] = useState(false)

  async function handleShare() {
    const url = window.location.origin + window.location.pathname
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url })
        return
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setShared(true)
        window.setTimeout(() => setShared(false), 1600)
      }
    } catch {
      /* annulation partage */
    }
  }

  return (
    <div className="detail-topbar">
      <Link href={backHref} className="iconbtn" aria-label="Retour">
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
      </Link>
      <span className="detail-topbar__title">{title}</span>
      <span className="flex-1" />
      <button type="button" className="iconbtn" aria-label="Partager" onClick={handleShare}>
        {shared ? (
          <Check className="h-[17px] w-[17px]" aria-hidden="true" />
        ) : (
          <Share className="h-[17px] w-[17px]" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
