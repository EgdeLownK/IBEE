import { formatEventSlot } from '@/lib/billetterie-registration-view'

type EventRegistrationEmailContext = {
  attendeeName: string
  attendeeEmail: string
  eventTitle: string
  eventStartAt: string
  eventEndAt: string | null
  locationLabel: string
  entityName: string
  ticketTypeTitle: string | null
  ticketCode: string
  ticketUrl: string
  cancelUrl?: string | null
  priceCents: number | null
  currency: string
}

function getFromAddress(): string {
  return process.env.BOOKING_EMAIL_FROM ?? 'IBEE <onboarding@resend.dev>'
}

function formatMoney(cents: number | null, currency: string): string {
  if (cents == null || cents <= 0) return 'Gratuit'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

async function sendTransactionalEmail(input: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[event-registration-email]', input.subject, '→', input.to)
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
  <p style="margin-top:24px;font-size:12px;color:#666">IBEE — billetterie événement</p>
</body></html>`
}

export async function sendEventRegistrationConfirmationEmail(ctx: EventRegistrationEmailContext) {
  const slot = formatEventSlot(ctx.eventStartAt, ctx.eventEndAt)
  const priceLabel = formatMoney(ctx.priceCents, ctx.currency)

  const html = emailLayout(
    'Inscription confirmée',
    `<p>Bonjour ${ctx.attendeeName},</p>
    <p>Votre inscription à l'événement est confirmée.</p>
    <ul>
      <li><strong>Événement :</strong> ${ctx.eventTitle}</li>
      ${ctx.ticketTypeTitle ? `<li><strong>Billet :</strong> ${ctx.ticketTypeTitle}</li>` : ''}
      <li><strong>Date :</strong> ${slot}</li>
      <li><strong>Lieu :</strong> ${ctx.locationLabel}</li>
      <li><strong>Organisateur :</strong> ${ctx.entityName}</li>
      <li><strong>Montant :</strong> ${priceLabel}</li>
      <li><strong>Code billet :</strong> ${ctx.ticketCode}</li>
    </ul>
    <p><a href="${ctx.ticketUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Voir mon billet</a></p>
    ${ctx.cancelUrl ? `<p style="font-size:13px;color:#666"><a href="${ctx.cancelUrl}">Annuler mon inscription</a></p>` : ''}
    <p style="font-size:13px;color:#666">Présentez ce code le jour J ou ouvrez le lien ci-dessus.</p>`,
  )

  return sendTransactionalEmail({
    to: ctx.attendeeEmail,
    subject: `Votre billet — ${ctx.eventTitle}`,
    html,
  })
}

export async function sendEventReminderEmail(ctx: {
  attendeeName: string
  attendeeEmail: string
  eventTitle: string
  eventStartAt: string
  eventEndAt: string | null
  ticketUrl: string
}) {
  const slot = formatEventSlot(ctx.eventStartAt, ctx.eventEndAt)
  const html = emailLayout(
    'Rappel — votre événement demain',
    `<p>Bonjour ${ctx.attendeeName},</p>
    <p>Rappel pour <strong>${ctx.eventTitle}</strong>.</p>
    <p><strong>Date :</strong> ${slot}</p>
    <p><a href="${ctx.ticketUrl}">Voir mon billet</a></p>`,
  )

  return sendTransactionalEmail({
    to: ctx.attendeeEmail,
    subject: `Rappel — ${ctx.eventTitle} demain`,
    html,
  })
}

export async function sendEventCancellationEmail(ctx: {
  attendeeName: string
  attendeeEmail: string
  eventTitle: string
  refunded: boolean
  refundCents: number
  currency: string
}) {
  const refundLine = ctx.refunded
    ? `<p>Un remboursement de ${formatMoney(ctx.refundCents, ctx.currency)} a été initié.</p>`
    : ''

  const html = emailLayout(
    'Inscription annulée',
    `<p>Bonjour ${ctx.attendeeName},</p>
    <p>Votre inscription à <strong>${ctx.eventTitle}</strong> a été annulée.</p>
    ${refundLine}`,
  )

  return sendTransactionalEmail({
    to: ctx.attendeeEmail,
    subject: `Annulation — ${ctx.eventTitle}`,
    html,
  })
}
