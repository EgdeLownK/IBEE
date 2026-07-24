'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Camera, Loader2, QrCode, ScanLine } from 'lucide-react'
import { parseContactFromQr } from '@ibee/shared'
import {
  consumeManualRegContactSessionAction,
  createManualRegContactSessionAction,
  pollManualRegContactSessionAction,
} from '@/app/dashboard/billetterie-actions'
import { buildManualRegContactUrl } from '@/lib/manual-reg-contact-url'

export type ManualRegContact = {
  name: string
  email: string
  phone: string
}

type ContactMode = 'none' | 'scan' | 'show-qr'

type Props = {
  eventId: string
  entitySlug: string
  eventSlug: string
  onContactFilled: (contact: ManualRegContact) => void
}

const POLL_MS = 2000

export function ManualRegContactPanel({ eventId, entitySlug, eventSlug, onContactFilled }: Props) {
  const [mode, setMode] = useState<ContactMode>('none')
  const [scanMessage, setScanMessage] = useState('')
  const [scanError, setScanError] = useState('')
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [cameraSupported, setCameraSupported] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScanRef = useRef('')

  const applyContact = useCallback(
    (contact: ManualRegContact) => {
      onContactFilled(contact)
      setMode('none')
      setScanMessage('Contact importé.')
      setScanError('')
    },
    [onContactFilled],
  )

  const handleScanRaw = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed || lastScanRef.current === trimmed) return

      const contact = parseContactFromQr(trimmed)
      if (!contact || (!contact.name && !contact.email && !contact.phone)) {
        setScanError('QR code non reconnu. Utilise une carte de visite ou un QR IBEE.')
        return
      }

      lastScanRef.current = trimmed
      setScanError('')
      applyContact(contact)
    },
    [applyContact],
  )

  useEffect(() => {
    setCameraSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  useEffect(() => {
    if (mode !== 'scan') {
      setCameraEnabled(false)
      setScanMessage('')
      setScanError('')
      lastScanRef.current = ''
      return
    }

    setCameraEnabled(true)
    setScanMessage('')
    setScanError('')
  }, [mode])

  useEffect(() => {
    if (mode !== 'scan' || !cameraEnabled || !cameraSupported) return

    let cancelled = false
    let intervalId: number | undefined

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        intervalId = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const codes = await detector.detect(videoRef.current)
            const value = codes[0]?.rawValue
            if (value) handleScanRaw(value)
          } catch {
            // Ignore transient detector errors.
          }
        }, 700)
      } catch {
        setCameraEnabled(false)
        setScanError('Caméra indisponible sur cet appareil.')
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraEnabled, cameraSupported, handleScanRaw, mode])

  useEffect(() => {
    if (mode !== 'show-qr') {
      setQrDataUrl(null)
      setQrError('')
      setSessionId(null)
      return
    }

    let cancelled = false
    setQrLoading(true)
    setQrError('')
    setQrDataUrl(null)

    void createManualRegContactSessionAction(eventId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setQrLoading(false)
        setQrError(result.error ?? 'Impossible de générer le QR.')
        return
      }

      setSessionId(result.sessionId)
      const url = buildManualRegContactUrl(
        result.entitySlug,
        result.eventSlug,
        result.token,
        window.location.origin,
      )

      void QRCode.toDataURL(url, {
        margin: 1,
        width: 180,
        color: { dark: '#111827', light: '#ffffff' },
      }).then((dataUrl) => {
        if (cancelled) return
        setQrDataUrl(dataUrl)
        setQrLoading(false)
      })
    })

    return () => {
      cancelled = true
    }
  }, [entitySlug, eventId, eventSlug, mode])

  useEffect(() => {
    if (mode !== 'show-qr' || !sessionId) return

    let cancelled = false

    const poll = () => {
      void pollManualRegContactSessionAction(sessionId).then((result) => {
        if (cancelled || !result.ok) return

        if (result.status === 'filled' && result.contact) {
          applyContact(result.contact)
          void consumeManualRegContactSessionAction(sessionId)
        }
      })
    }

    poll()
    const intervalId = window.setInterval(poll, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [applyContact, mode, sessionId])

  function toggleMode(next: ContactMode) {
    setMode((current) => (current === next ? 'none' : next))
  }

  return (
    <div className="event-manual-reg__qr-tools">
      <div
        className="event-manual-reg__qr-tabs"
        role="tablist"
        aria-label="Remplir le contact par QR"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'scan'}
          className={`event-manual-reg__qr-tab${mode === 'scan' ? ' is-active' : ''}`}
          onClick={() => toggleMode('scan')}
        >
          <ScanLine className="event-manual-reg__qr-tab-icon" aria-hidden="true" />
          Scanner
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'show-qr'}
          className={`event-manual-reg__qr-tab${mode === 'show-qr' ? ' is-active' : ''}`}
          onClick={() => toggleMode('show-qr')}
        >
          <QrCode className="event-manual-reg__qr-tab-icon" aria-hidden="true" />
          Faire scanner
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="event-manual-reg__qr-panel" role="tabpanel">
          <p className="event-manual-reg__qr-hint">
            Scanne la carte de visite ou le QR contact du participant.
          </p>
          {cameraSupported ? (
            <div className="event-manual-reg__qr-scan-head">
              <button
                type="button"
                className="event-manual-reg__qr-camera-btn"
                onClick={() => setCameraEnabled((value) => !value)}
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                {cameraEnabled ? 'Pause caméra' : 'Activer la caméra'}
              </button>
            </div>
          ) : null}
          {cameraEnabled && cameraSupported ? (
            <div className="event-manual-reg__qr-video-wrap">
              <video ref={videoRef} className="event-manual-reg__qr-video" playsInline muted />
            </div>
          ) : (
            <p className="event-manual-reg__qr-hint event-manual-reg__qr-hint--muted">
              {cameraSupported
                ? 'Active la caméra pour scanner un QR contact.'
                : 'Scan caméra non supporté sur ce navigateur.'}
            </p>
          )}
          {scanMessage ? (
            <p className="event-manual-reg__qr-feedback is-success">{scanMessage}</p>
          ) : null}
          {scanError ? <p className="event-manual-reg__qr-feedback is-error">{scanError}</p> : null}
        </div>
      ) : null}

      {mode === 'show-qr' ? (
        <div className="event-manual-reg__qr-panel" role="tabpanel">
          <p className="event-manual-reg__qr-hint">
            Le participant scanne ce QR sur son téléphone et remplit ses coordonnées. Les champs se
            remplissent automatiquement ici.
          </p>
          <div className="event-manual-reg__qr-display">
            {qrLoading ? (
              <div className="event-manual-reg__qr-skeleton" aria-hidden="true">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR code pour remplir le contact participant"
                width={180}
                height={180}
                className="event-manual-reg__qr-image"
              />
            ) : (
              <div className="event-manual-reg__qr-skeleton" aria-hidden="true" />
            )}
          </div>
          {qrError ? <p className="event-manual-reg__qr-feedback is-error">{qrError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
