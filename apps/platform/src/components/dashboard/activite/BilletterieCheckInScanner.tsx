'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Camera, Keyboard } from 'lucide-react'
import type { EventCheckInResult } from '@ibee/supabase'
import { checkInRegistrationAction } from '@/app/dashboard/billetterie-actions'

export type CheckInScannerMode = 'staff-mobile' | 'staff-desktop'

type Props = {
  eventId: string
  onCheckedIn: () => void
  mode: CheckInScannerMode
}

type ScanState =
  | { kind: 'idle' }
  | { kind: 'success'; result: EventCheckInResult }
  | { kind: 'error'; message: string }

function extractTicketCode(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const code = url.searchParams.get('code')
    if (code) return code.trim()
  } catch {
    // Not a URL — use raw value.
  }

  return trimmed
}

export function BilletterieCheckInScanner({ eventId, onCheckedIn, mode }: Props) {
  const isMobileMode = mode === 'staff-mobile'
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [scanState, setScanState] = useState<ScanState>({ kind: 'idle' })
  const [cameraEnabled, setCameraEnabled] = useState(isMobileMode)
  const [cameraSupported, setCameraSupported] = useState(false)
  const [isPending, startTransition] = useTransition()
  const lastScanRef = useRef<string>('')

  const submitCode = useCallback(
    (rawCode: string) => {
      const ticketCode = extractTicketCode(rawCode)
      if (!ticketCode || isPending) return
      if (lastScanRef.current === ticketCode && scanState.kind === 'success') return

      startTransition(async () => {
        const response = await checkInRegistrationAction({ ticketCode, eventId })
        if (!response.ok) {
          setScanState({ kind: 'error', message: response.error })
          return
        }

        lastScanRef.current = ticketCode
        setScanState({ kind: 'success', result: response.result })

        if (response.result.status === 'checked_in') {
          onCheckedIn()
        }
      })
    },
    [eventId, isPending, onCheckedIn, scanState.kind]
  )

  useEffect(() => {
    setCameraSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  useEffect(() => {
    setCameraEnabled(isMobileMode)
  }, [isMobileMode])

  useEffect(() => {
    if (!isMobileMode || !cameraEnabled || !cameraSupported) return

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
            if (value) submitCode(value)
          } catch {
            // Ignore transient detector errors.
          }
        }, 700)
      } catch {
        setCameraEnabled(false)
        setScanState({
          kind: 'error',
          message: 'Caméra indisponible. Saisissez le code manuellement.',
        })
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraEnabled, cameraSupported, isMobileMode, submitCode])

  const resultMessage =
    scanState.kind === 'success'
      ? scanState.result.status === 'checked_in'
        ? `Entrée validée — ${scanState.result.attendeeName}`
        : scanState.result.status === 'already_checked_in'
          ? `Déjà scanné — ${scanState.result.attendeeName}`
          : scanState.result.status === 'cancelled'
            ? 'Billet annulé'
            : scanState.result.status === 'wrong_event'
              ? `Billet pour un autre événement (${scanState.result.eventTitle})`
              : 'Billet introuvable'
      : scanState.kind === 'error'
        ? scanState.message
        : null

  const manualForm = (
    <form
      className="billetterie-checkin__manual"
      onSubmit={(event) => {
        event.preventDefault()
        submitCode(manualCode)
        setManualCode('')
      }}
    >
      <label className="billetterie-checkin__manual-label">
        <Keyboard className="h-4 w-4" aria-hidden="true" />
        Code billet
      </label>
      <div className="billetterie-checkin__manual-row">
        <input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value.toUpperCase())}
          placeholder="EVT-XXXXXXXXXX"
          className="billetterie-checkin__manual-input"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn btn--primary" disabled={isPending || !manualCode.trim()}>
          Valider
        </button>
      </div>
    </form>
  )

  if (!isMobileMode) {
    return (
      <div className="billetterie-checkin__scanner billetterie-checkin__scanner--desktop-manual">
        <details className="billetterie-checkin__manual-fallback">
          <summary className="billetterie-checkin__manual-fallback-summary">
            Saisie manuelle (secours)
          </summary>
          {manualForm}
        </details>
        {resultMessage ? (
          <CheckInResultMessage scanState={scanState} message={resultMessage} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="billetterie-checkin__scanner billetterie-checkin__scanner--mobile">
      <div className="billetterie-checkin__scanner-head">
        <h2 className="billetterie-checkin__section-title">Scanner les billets</h2>
        {cameraSupported ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setScanState({ kind: 'idle' })
              setCameraEnabled((value) => !value)
            }}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {cameraEnabled ? 'Pause' : 'Caméra'}
          </button>
        ) : null}
      </div>

      {cameraEnabled ? (
        <div className="billetterie-checkin__video-wrap billetterie-checkin__video-wrap--hero">
          <video ref={videoRef} className="billetterie-checkin__video" playsInline muted />
        </div>
      ) : (
        <p className="billetterie-checkin__hint">
          {cameraSupported
            ? 'Active la caméra pour scanner un QR code.'
            : 'Scan caméra non supporté ici — saisis le code billet.'}
        </p>
      )}

      {!cameraSupported ? manualForm : null}

      {resultMessage ? (
        <CheckInResultMessage scanState={scanState} message={resultMessage} />
      ) : null}
    </div>
  )
}

function CheckInResultMessage({
  scanState,
  message,
}: {
  scanState: ScanState
  message: string
}) {
  return (
    <p
      className={`billetterie-checkin__result${
        scanState.kind === 'success' &&
        (scanState.result.status === 'checked_in' || scanState.result.status === 'already_checked_in')
          ? ' is-success'
          : scanState.kind === 'success'
            ? ' is-warning'
            : ' is-error'
      }`}
      role="status"
    >
      {message}
    </p>
  )
}
