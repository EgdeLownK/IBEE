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

export function createEventCancelToken(registrationId: string, expiresAtMs: number): string {
  const payload = `${registrationId}:${expiresAtMs}`
  return `${Buffer.from(payload, 'utf8').toString('base64url')}.${signPayload(payload)}`
}

export function verifyEventCancelToken(
  token: string,
): { registrationId: string; expiresAtMs: number } | null {
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

  const [registrationId, expiresRaw] = payload.split(':')
  const expiresAtMs = Number(expiresRaw)
  if (!registrationId || !Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) return null

  return { registrationId, expiresAtMs }
}

export function buildEventCancelUrl(
  registrationId: string,
  startAtIso: string,
  cancelMinHours: number,
): string {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const startMs = new Date(startAtIso).getTime()
  const expiresAtMs = startMs - cancelMinHours * 60 * 60 * 1000
  const token = createEventCancelToken(registrationId, expiresAtMs)
  return `${base}/event/cancel?token=${encodeURIComponent(token)}`
}
