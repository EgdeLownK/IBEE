'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  buildPayoutTransfersCsv,
  createOneTimePayoutTransfers,
  deletePayoutSchedule,
  getEntityByUserId,
  getPayoutSchedule,
  listPayoutTransfers,
  markPayoutTransfersCompleted,
  markPayoutTransfersExported,
  upsertPayoutSchedule,
  type PayoutAllocationInput,
  type PayoutRecurrence,
} from '@ibee/supabase'

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function requireOwnerEntity() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non authentifié.' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

  return { ok: true as const, supabase, user, entity }
}

function parseAllocations(
  raw: Array<{
    recipientType: 'owner' | 'member'
    memberId: string | null
    amountType: 'fixed' | 'percent'
    amountValue: number
    startDate?: string
    endDate?: string | null
    recurrence?: 'weekly' | 'monthly' | 'quarterly'
  }>
): PayoutAllocationInput[] {
  return raw
    .filter((row) => row.amountValue > 0)
    .map((row) => ({
      recipientType: row.recipientType,
      memberId: row.memberId,
      amountType: row.amountType,
      amountValue:
        row.amountType === 'fixed'
          ? Math.round(row.amountValue * 100)
          : Math.round(row.amountValue * 100),
      startDate: row.startDate || new Date().toISOString().slice(0, 10),
      endDate: row.endDate || null,
      recurrence: row.recurrence || 'monthly',
    }))
}

export async function savePayoutScheduleAction(input: {
  isActive: boolean
  allocations: Array<{
    recipientType: 'owner' | 'member'
    memberId: string | null
    amountType: 'fixed' | 'percent'
    amountValue: number
    startDate?: string
    endDate?: string | null
    recurrence: 'weekly' | 'monthly' | 'quarterly'
  }>
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  const allocations = parseAllocations(input.allocations)
  const validationError = validateAllocations(allocations)
  if (validationError) return { ok: false, error: validationError }

  try {
    const schedule = await upsertPayoutSchedule(ctx.supabase, ctx.entity.id, {
      isActive: input.isActive,
      allocations,
    })
    revalidatePath('/dashboard/revenus')
    return { ok: true, data: { id: schedule.id } }
  } catch (err) {
    console.error('[savePayoutScheduleAction]', err)
    const message = err instanceof Error ? err.message : 'Enregistrement impossible.'
    return { ok: false, error: message }
  }
}

function validateAllocations(allocations: PayoutAllocationInput[]): string | null {
  if (allocations.length === 0) {
    return 'Renseignez au moins un montant pour un membre.'
  }
  for (const allocation of allocations) {
    if (allocation.amountType === 'percent' && allocation.amountValue > 10000) {
      return 'Le pourcentage ne peut pas dépasser 100 %.'
    }
    if (allocation.amountType === 'fixed' && allocation.amountValue < 100) {
      return 'Le montant fixe minimum est de 1 €.'
    }
    if (allocation.endDate && allocation.endDate < allocation.startDate) {
      return 'La date de fin doit être après ou égale à la date de début.'
    }
  }
  return null
}

export async function createOneTimePayoutAction(input: {
  allocations: Array<{
    recipientType: 'owner' | 'member'
    memberId: string | null
    amountType: 'fixed' | 'percent'
    amountValue: number
    startDate?: string
    endDate?: string | null
  }>
}): Promise<ActionResult<{ transferIds: string[] }>> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  const allocations = parseAllocations(input.allocations)
  const validationError = validateAllocations(allocations)
  if (validationError) return { ok: false, error: validationError }

  try {
    const transfers = await createOneTimePayoutTransfers(
      ctx.supabase,
      ctx.entity.id,
      allocations,
      {
        name: ctx.entity.display_name,
        email: ctx.user.email ?? '',
      }
    )
    revalidatePath('/dashboard/revenus')
    return { ok: true, data: { transferIds: transfers.map((transfer) => transfer.id) } }
  } catch (err) {
    console.error('[createOneTimePayoutAction]', err)
    const message = err instanceof Error ? err.message : 'Création impossible.'
    return { ok: false, error: message }
  }
}

export async function disablePayoutScheduleAction(): Promise<ActionResult> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  try {
    await deletePayoutSchedule(ctx.supabase, ctx.entity.id)
    revalidatePath('/dashboard/revenus')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[disablePayoutScheduleAction]', err)
    const message = err instanceof Error ? err.message : 'Suppression impossible.'
    return { ok: false, error: message }
  }
}

export async function exportPayoutTransfersAction(): Promise<
  ActionResult<{ csv: string; filename: string; transferIds: string[] }>
> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  try {
    const transfers = await listPayoutTransfers(ctx.supabase, ctx.entity.id, 200)
    const pending = transfers.filter((transfer) => transfer.status === 'pending')
    if (pending.length === 0) {
      return { ok: false, error: 'Aucun virement en attente à exporter.' }
    }

    const csv = buildPayoutTransfersCsv(pending)
    const transferIds = pending.map((transfer) => transfer.id)
    await markPayoutTransfersExported(ctx.supabase, ctx.entity.id, transferIds)
    revalidatePath('/dashboard/revenus')

    const date = new Date().toISOString().slice(0, 10)
    return {
      ok: true,
      data: {
        csv,
        filename: `virements-equipe-${ctx.entity.slug}-${date}.csv`,
        transferIds,
      },
    }
  } catch (err) {
    console.error('[exportPayoutTransfersAction]', err)
    const message = err instanceof Error ? err.message : 'Export impossible.'
    return { ok: false, error: message }
  }
}

export async function completePayoutTransfersAction(
  transferIds: string[]
): Promise<ActionResult> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  if (transferIds.length === 0) {
    return { ok: false, error: 'Sélectionnez au moins un virement.' }
  }

  try {
    await markPayoutTransfersCompleted(ctx.supabase, ctx.entity.id, transferIds)
    revalidatePath('/dashboard/revenus')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[completePayoutTransfersAction]', err)
    const message = err instanceof Error ? err.message : 'Mise à jour impossible.'
    return { ok: false, error: message }
  }
}

export async function getPayoutScheduleAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getPayoutSchedule>>>
> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  try {
    const schedule = await getPayoutSchedule(ctx.supabase, ctx.entity.id)
    return { ok: true, data: schedule }
  } catch (err) {
    console.error('[getPayoutScheduleAction]', err)
    const message = err instanceof Error ? err.message : 'Lecture impossible.'
    return { ok: false, error: message }
  }
}
