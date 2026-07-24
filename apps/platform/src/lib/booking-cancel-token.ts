import { createHmac, timingSafeEqual } from 'node:crypto'

function getSecret(): string {
  const secret =
    process.env.BOOKING_EMAIL_SECRET ??
    process.env.CRON_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Secret manquant pour signer les liens d’annulation.')
  }
  return secret
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createBookingCancelToken(bookingId: string, expiresAtMs: number): string {
  const payload = `${bookingId}:${expiresAtMs}`
  return `${Buffer.from(payload, 'utf8').toString('base64url')}.${signPayload(payload)}`
}

export function verifyBookingCancelToken(
  token: string,
): { bookingId: string; expiresAtMs: number } | null {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const expected = signPayload(payload)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null

  const [bookingId, expiresRaw] = payload.split(':')
  const expiresAtMs = Number(expiresRaw)
  if (!bookingId || !Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) return null

  return { bookingId, expiresAtMs }
}

export function buildBookingCancelUrl(bookingId: string, startAtIso: string): string {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const expiresAtMs = new Date(startAtIso).getTime()
  const token = createBookingCancelToken(bookingId, expiresAtMs)
  return `${base}/booking/cancel?token=${encodeURIComponent(token)}`
}
