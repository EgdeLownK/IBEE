'use server'

import { revalidatePath } from 'next/cache'
import {
  createDiscountCode,
  countEventActivityHolds,
  countEventRegistrations,
  createEventActivity,
  createTicketType,
  deleteDiscountCode,
  deleteEventActivity,
  deleteTicketType,
  getEventById,
  listActivitiesByEvent,
  setDiscountCodeProducts,
  updateEventSettings,
  updateEventActivity,
  updateTicketType,
} from '@ibee/supabase'
import { requireDashboardContext } from '@/lib/dashboard-context'
import { EVENT_ROOT_PLACE_ID } from '@/lib/event-place-view'
import { loadEventEditData } from '@/lib/load-event-edit'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import type { EventRegistrationField } from '@/lib/event-registration-fields'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

async function requireOwnedEvent(eventId: string) {
  const ctx = await requireDashboardContext()
  const event = await getEventById(ctx.supabase, eventId)
  if (!event || event.entity_id !== ctx.entity.id) {
    return null
  }
  return { ctx, event }
}

function revalidateEvent(entitySlug: string, eventSlug: string) {
  revalidatePath('/dashboard/site')
  revalidatePath(`/dashboard/site/events/${eventSlug}`)
  revalidatePath('/dashboard/billetterie')
  revalidateAfterEntityMutation(entitySlug, { eventSlug })
}

export async function saveEventTicketTypeAction(input: {
  eventId: string
  ticketTypeId?: string | null
  activityId?: string | null
  title: string
  priceEuros: string
  salesStartAt?: string | null
  salesEndAt?: string | null
  quota?: string | null
}) {
  const owned = await requireOwnedEvent(input.eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  const title = input.title.trim()
  if (title.length < 1 || title.length > 120) {
    return { ok: false as const, error: 'Titre invalide.' }
  }

  const price = Math.round(Number(input.priceEuros.replace(',', '.')) * 100)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false as const, error: 'Prix invalide.' }
  }

  const quotaRaw = input.quota?.trim()
  const quota = quotaRaw ? Number(quotaRaw) : null
  if (quota != null && (!Number.isInteger(quota) || quota <= 0)) {
    return { ok: false as const, error: 'Quota invalide.' }
  }

  try {
    if (input.activityId) {
      const activities = await listActivitiesByEvent(owned.ctx.supabase, input.eventId, {
        publishedOnly: false,
      })
      if (!activities.some((activity) => activity.id === input.activityId)) {
        return { ok: false as const, error: 'Activité introuvable.' }
      }
    }

    if (input.ticketTypeId) {
      await updateTicketType(owned.ctx.supabase, input.ticketTypeId, {
        title,
        price_cents: price,
        sales_start_at: input.salesStartAt || null,
        sales_end_at: input.salesEndAt || null,
        quota,
      })
    } else {
      const slug = slugify(title) || 'billet'
      await createTicketType(owned.ctx.supabase, {
        eventId: input.eventId,
        entityId: owned.ctx.entity.id,
        activityId: input.activityId ?? null,
        title,
        slug,
        priceCents: price,
        salesStartAt: input.salesStartAt || null,
        salesEndAt: input.salesEndAt || null,
        quota,
      })
    }

    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[saveEventTicketTypeAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer le billet.' }
  }
}

export async function deleteEventTicketTypeAction(eventId: string, ticketTypeId: string) {
  const owned = await requireOwnedEvent(eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  try {
    await deleteTicketType(owned.ctx.supabase, ticketTypeId)
    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[deleteEventTicketTypeAction]', err)
    return { ok: false as const, error: 'Impossible de supprimer ce billet.' }
  }
}

export async function saveEventRegistrationSettingsAction(input: {
  eventId: string
  cancelMinHours: number
  registrationFields: EventRegistrationField[]
}) {
  const owned = await requireOwnedEvent(input.eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  if (input.cancelMinHours < 0 || input.cancelMinHours > 720) {
    return { ok: false as const, error: 'Délai d’annulation invalide.' }
  }

  if (input.registrationFields.length > 8) {
    return { ok: false as const, error: 'Maximum 8 champs custom.' }
  }

  try {
    await updateEventSettings(owned.ctx.supabase, input.eventId, {
      cancel_min_hours: input.cancelMinHours,
      registration_fields: input.registrationFields,
    })
    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[saveEventRegistrationSettingsAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer les paramètres.' }
  }
}

export async function saveEventPromoCodeAction(input: {
  eventId: string
  code: string
  type: 'percentage' | 'fixed_amount'
  value: string
  maxUses?: string | null
  endsAt?: string | null
}) {
  const owned = await requireOwnedEvent(input.eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  const code = input.code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
  if (code.length < 3) return { ok: false as const, error: 'Code trop court.' }

  const valueNum = Number(input.value.replace(',', '.'))
  if (!Number.isFinite(valueNum) || valueNum <= 0) {
    return { ok: false as const, error: 'Valeur de réduction invalide.' }
  }

  const maxUsesRaw = input.maxUses?.trim()
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    return { ok: false as const, error: 'Limite d’utilisations invalide.' }
  }

  try {
    const promo = await createDiscountCode(owned.ctx.supabase, {
      entity_id: owned.ctx.entity.id,
      code,
      type: input.type,
      value: valueNum,
      applies_to: 'specific_events',
      max_uses_total: maxUses,
      ends_at: input.endsAt || null,
      is_active: true,
    })

    await owned.ctx.supabase.from('discount_code_events').insert({
      code_id: promo.id,
      event_id: input.eventId,
    })

    void setDiscountCodeProducts(owned.ctx.supabase, promo.id, [])

    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[saveEventPromoCodeAction]', err)
    return { ok: false as const, error: 'Impossible de créer le code promo.' }
  }
}

export async function deleteEventPromoCodeAction(eventId: string, codeId: string) {
  const owned = await requireOwnedEvent(eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  try {
    await deleteDiscountCode(owned.ctx.supabase, codeId)
    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[deleteEventPromoCodeAction]', err)
    return { ok: false as const, error: 'Impossible de supprimer le code.' }
  }
}

export async function saveEventActivityAction(input: {
  eventId: string
  activityId?: string | null
  title: string
  startAt: string
  endAt?: string | null
  capacity?: string | null
}) {
  const owned = await requireOwnedEvent(input.eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  const title = input.title.trim()
  if (title.length < 1 || title.length > 120) {
    return { ok: false as const, error: 'Titre invalide.' }
  }

  if (!input.startAt) {
    return { ok: false as const, error: 'Date de début requise.' }
  }

  const capacityRaw = input.capacity?.trim()
  const capacity = capacityRaw ? Number(capacityRaw) : null
  if (capacity != null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { ok: false as const, error: 'Capacité invalide.' }
  }

  if (capacity != null && input.activityId && input.activityId !== EVENT_ROOT_PLACE_ID) {
    try {
      const holds = await countEventActivityHolds(owned.ctx.supabase, input.activityId)
      if (capacity < holds) {
        return {
          ok: false as const,
          error: `Capacité trop basse : ${holds} inscription${holds > 1 ? 's' : ''} déjà comptée${holds > 1 ? 's' : ''}.`,
        }
      }
    } catch (err) {
      console.error('[saveEventActivityAction] holds', err)
      return { ok: false as const, error: 'Impossible de vérifier les inscriptions.' }
    }
  }

  if (capacity != null && input.activityId === EVENT_ROOT_PLACE_ID) {
    try {
      const holds = await countEventRegistrations(owned.ctx.supabase, input.eventId)
      if (capacity < holds) {
        return {
          ok: false as const,
          error: `Capacité trop basse : ${holds} inscription${holds > 1 ? 's' : ''} déjà comptée${holds > 1 ? 's' : ''}.`,
        }
      }
    } catch (err) {
      console.error('[saveEventActivityAction] event holds', err)
      return { ok: false as const, error: 'Impossible de vérifier les inscriptions.' }
    }
  }

  try {
    if (input.activityId === EVENT_ROOT_PLACE_ID) {
      await updateEventSettings(owned.ctx.supabase, input.eventId, { capacity })
    } else if (input.activityId) {
      await updateEventActivity(owned.ctx.supabase, input.activityId, {
        title,
        start_at: new Date(input.startAt).toISOString(),
        end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
        capacity,
      })
    } else {
      const slug = slugify(title) || 'activite'
      await createEventActivity(owned.ctx.supabase, {
        eventId: input.eventId,
        entityId: owned.ctx.entity.id,
        title,
        slug,
        startAt: new Date(input.startAt).toISOString(),
        endAt: input.endAt ? new Date(input.endAt).toISOString() : null,
        capacity,
      })
    }

    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[saveEventActivityAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer l’activité.' }
  }
}

export async function deleteEventActivityAction(eventId: string, activityId: string) {
  const owned = await requireOwnedEvent(eventId)
  if (!owned) return { ok: false as const, error: 'Événement introuvable.' }

  try {
    await deleteEventActivity(owned.ctx.supabase, activityId)
    revalidateEvent(owned.ctx.entity.slug, owned.event.slug)
    return { ok: true as const }
  } catch (err) {
    console.error('[deleteEventActivityAction]', err)
    return { ok: false as const, error: 'Impossible de supprimer cette activité.' }
  }
}

export async function loadEventEditDataAction(eventId: string) {
  const ctx = await requireDashboardContext()
  if (!ctx) return { ok: false as const, error: 'Non authentifié.' }

  const data = await loadEventEditData(ctx.supabase, ctx.entity.id, eventId)
  if (!data) return { ok: false as const, error: 'Événement introuvable.' }

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  return {
    ok: true as const,
    data,
    publicEventHref: `${siteUrl}/${ctx.entity.slug}/events/${data.event.slug}`,
  }
}
