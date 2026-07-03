'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Smartphone } from 'lucide-react'
import { buildStaffCheckInUrl } from '@/lib/check-in-layout'

type Props = {
  eventId: string
  eventTitle: string
}

export function CheckInStaffQr({ eventId, eventTitle }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = buildStaffCheckInUrl(eventId, window.location.origin)
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 200,
      color: { dark: '#111827', light: '#ffffff' },
    }).then(setDataUrl)
  }, [eventId])

  return (
    <section className="billetterie-checkin__staff-qr" aria-label="Ouvrir le scan sur mobile">
      <div className="billetterie-checkin__staff-qr-icon" aria-hidden="true">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="billetterie-checkin__staff-qr-body">
        <h2 className="billetterie-checkin__section-title">Scanner depuis ton téléphone</h2>
        <p className="billetterie-checkin__staff-qr-text">
          Flashe ce QR sur mobile pour ouvrir le mode scan — idéal à l&apos;entrée de{' '}
          <strong>{eventTitle}</strong>.
        </p>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="QR code pour ouvrir le check-in sur mobile"
            className="billetterie-checkin__staff-qr-image"
            width={200}
            height={200}
          />
        ) : (
          <div className="billetterie-checkin__staff-qr-skeleton" aria-hidden="true" />
        )}
      </div>
    </section>
  )
}
