import { buildBookingCancelUrl } from '@/lib/booking-cancel-token'
import { formatBookingSlot } from '@/lib/service-booking-view'

type BookingEmailContext = {
  bookingId: string
  bookerName: string
  bookerEmail: string
  startAt: string
  endAt: string
  serviceTitle: string
  locationLabel: string
  entityName: string
  status: 'pending' | 'confirmed'
}

function getFromAddress(): string {
  return process.env.BOOKING_EMAIL_FROM ?? 'IBEE <onboarding@resend.dev>'
}

async function sendTransactionalEmail(input: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[booking-email]', input.subject, '→', input.to)
    }
    return { ok: false, skipped: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    return { ok: false, error: body || response.statusText }
  }

  return { ok: true }
}

function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><body style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111;padding:24px">
  <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
  ${body}
  <p style="margin-top:24px;font-size:12px;color:#666">IBEE — gestion de rendez-vous</p>
</body></html>`
}

export async function sendBookingConfirmationEmail(ctx: BookingEmailContext) {
  const slot = formatBookingSlot(ctx.startAt, ctx.endAt)
  const cancelUrl = buildBookingCancelUrl(ctx.bookingId, ctx.startAt)
  const intro =
    ctx.status === 'confirmed'
      ? 'Votre rendez-vous est confirmé.'
      : 'Votre demande de rendez-vous a bien été reçue et est en attente de validation.'

  const html = emailLayout(
    ctx.status === 'confirmed' ? 'Rendez-vous confirmé' : 'Demande de rendez-vous reçue',
    `<p>Bonjour ${ctx.bookerName},</p>
    <p>${intro}</p>
    <ul>
      <li><strong>Prestation :</strong> ${ctx.serviceTitle}</li>
      <li><strong>Créneau :</strong> ${slot}</li>
      <li><strong>Lieu :</strong> ${ctx.locationLabel}</li>
      <li><strong>Avec :</strong> ${ctx.entityName}</li>
    </ul>
    <p><a href="${cancelUrl}">Annuler ce rendez-vous</a></p>`,
  )

  return sendTransactionalEmail({
    to: ctx.bookerEmail,
    subject:
      ctx.status === 'confirmed'
        ? `Rendez-vous confirmé — ${ctx.serviceTitle}`
        : `Demande reçue — ${ctx.serviceTitle}`,
    html,
  })
}

export async function sendBookingReminderEmail(ctx: BookingEmailContext) {
  const slot = formatBookingSlot(ctx.startAt, ctx.endAt)
  const cancelUrl = buildBookingCancelUrl(ctx.bookingId, ctx.startAt)

  const html = emailLayout(
    'Rappel de rendez-vous',
    `<p>Bonjour ${ctx.bookerName},</p>
    <p>Rappel : vous avez un rendez-vous demain.</p>
    <ul>
      <li><strong>Prestation :</strong> ${ctx.serviceTitle}</li>
      <li><strong>Créneau :</strong> ${slot}</li>
      <li><strong>Lieu :</strong> ${ctx.locationLabel}</li>
      <li><strong>Avec :</strong> ${ctx.entityName}</li>
    </ul>
    <p><a href="${cancelUrl}">Annuler ce rendez-vous</a></p>`,
  )

  return sendTransactionalEmail({
    to: ctx.bookerEmail,
    subject: `Rappel — ${ctx.serviceTitle} demain`,
    html,
  })
}
