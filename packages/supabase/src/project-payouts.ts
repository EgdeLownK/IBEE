import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { listTeamMembers } from './team'

type Client = SupabaseClient<Database>

export type PayoutRecurrence = Database['public']['Enums']['entity_payout_recurrence']
export type PayoutAmountType = Database['public']['Enums']['entity_payout_amount_type']
export type PayoutRecipientType = Database['public']['Enums']['entity_payout_recipient_type']
export type PayoutTransferStatus = Database['public']['Enums']['entity_payout_transfer_status']

export type PayoutRecipient = {
  recipientType: PayoutRecipientType
  memberId: string | null
  name: string
  email: string
}

export type PayoutAllocationInput = {
  recipientType: PayoutRecipientType
  memberId: string | null
  amountType: PayoutAmountType
  amountValue: number
  startDate: string
  endDate: string | null
  recurrence: PayoutRecurrence
}

export type PayoutAllocationRecord = PayoutAllocationInput & {
  id: string
}

export type PayoutScheduleRecord = {
  id: string
  entityId: string
  recurrence: PayoutRecurrence
  isActive: boolean
  nextRunAt: string
  lastRunAt: string | null
  allocations: PayoutAllocationRecord[]
}

export type PayoutTransferRecord = {
  id: string
  recipientName: string
  recipientEmail: string
  recipientType: PayoutRecipientType
  memberId: string | null
  periodStart: string
  periodEnd: string
  revenueBasisCents: number
  amountCents: number
  status: PayoutTransferStatus
  scheduledAt: string
  exportedAt: string | null
  completedAt: string | null
  isOneTime: boolean
}

export type ProjectExpenseRecord = {
  id: string
  entityId: string
  amountCents: number
  description: string
  status: Database['public']['Enums']['entity_expense_status']
  incurredAt: string
}

export type ProjectPayoutSnapshot = {
  schedule: PayoutScheduleRecord | null
  transfers: PayoutTransferRecord[]
  expenses: ProjectExpenseRecord[]
  recipients: PayoutRecipient[]
  nextPayoutLabel: string | null
  availableBalanceCents: number
}

const RECURRENCE_LABELS: Record<PayoutRecurrence, string> = {
  weekly: 'hebdomadaire',
  monthly: 'mensuel',
  quarterly: 'trimestriel',
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addRecurrence(date: Date, recurrence: PayoutRecurrence): Date {
  const next = new Date(date)
  if (recurrence === 'weekly') {
    next.setDate(next.getDate() + 7)
    return next
  }
  if (recurrence === 'monthly') {
    next.setMonth(next.getMonth() + 1)
    next.setDate(1)
    next.setHours(8, 0, 0, 0)
    return next
  }
  next.setMonth(next.getMonth() + 3)
  next.setDate(1)
  next.setHours(8, 0, 0, 0)
  return next
}

export function computeInitialNextRunAt(recurrence: PayoutRecurrence, from = new Date()): Date {
  const base = new Date(from)
  base.setHours(8, 0, 0, 0)
  if (recurrence === 'weekly') {
    const day = base.getDay()
    const daysUntilMonday = ((8 - day) % 7) || 7
    base.setDate(base.getDate() + daysUntilMonday)
    return base
  }
  if (recurrence === 'monthly') {
    base.setMonth(base.getMonth() + 1, 1)
    return base
  }
  const quarterMonth = Math.floor(base.getMonth() / 3) * 3 + 3
  base.setMonth(quarterMonth, 1)
  return base
}

export function formatPayoutStartDateInput(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultPayoutStartDateInput(from = new Date()): string {
  return formatPayoutStartDateInput(from)
}

export function parsePayoutStartDateInput(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    throw new Error('Date de départ invalide.')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 8, 0, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Date de départ invalide.')
  }
  return date
}

function periodStartForRun(
  recurrence: PayoutRecurrence,
  lastRunAt: string | null,
  runAt: Date
): Date {
  if (lastRunAt) return new Date(lastRunAt)

  const end = new Date(runAt)
  const start = new Date(end)
  if (recurrence === 'weekly') {
    start.setDate(start.getDate() - 7)
    return startOfDay(start)
  }
  if (recurrence === 'monthly') {
    start.setMonth(start.getMonth() - 1, 1)
    return startOfDay(start)
  }
  start.setMonth(start.getMonth() - 3, 1)
  return startOfDay(start)
}

export async function getEntityRevenueCentsInWindow(
  client: Client,
  entityId: string,
  from: Date,
  to: Date
): Promise<number> {
  const [shopOrders, eventOrders, paidBookings] = await Promise.all([
    client
      .from('orders')
      .select('paid_at, total_cents')
      .eq('entity_id', entityId)
      .eq('status', 'paid')
      .eq('order_kind', 'product')
      .gte('paid_at', from.toISOString())
      .lt('paid_at', to.toISOString()),
    client
      .from('orders')
      .select('paid_at, total_cents')
      .eq('entity_id', entityId)
      .eq('status', 'paid')
      .eq('order_kind', 'event_ticket')
      .gte('paid_at', from.toISOString())
      .lt('paid_at', to.toISOString()),
    client
      .from('bookings')
      .select('paid_at, price_cents')
      .eq('entity_id', entityId)
      .eq('payment_status', 'paid')
      .gte('paid_at', from.toISOString())
      .lt('paid_at', to.toISOString()),
  ])

  if (shopOrders.error) throw new Error(shopOrders.error.message)
  if (eventOrders.error) throw new Error(eventOrders.error.message)
  if (paidBookings.error) throw new Error(paidBookings.error.message)

  const shopCents = (shopOrders.data ?? []).reduce((sum, row) => sum + (row.total_cents ?? 0), 0)
  const eventCents = (eventOrders.data ?? []).reduce((sum, row) => sum + (row.total_cents ?? 0), 0)
  const bookingCents = (paidBookings.data ?? [])
    .filter((row) => row.paid_at)
    .reduce((sum, row) => sum + (row.price_cents ?? 0), 0)

  return shopCents + eventCents + bookingCents
}

function computeAllocationAmountCents(
  allocation: PayoutAllocationInput,
  revenueBasisCents: number
): number {
  if (allocation.amountType === 'fixed') {
    return allocation.amountValue
  }
  return Math.round((revenueBasisCents * allocation.amountValue) / 10000)
}

export async function listPayoutRecipients(
  client: Client,
  entityId: string,
  owner: { name: string; email: string }
): Promise<PayoutRecipient[]> {
  const members = await listTeamMembers(client, entityId)
  const recipients: PayoutRecipient[] = [
    {
      recipientType: 'owner',
      memberId: null,
      name: owner.name,
      email: owner.email,
    },
  ]

  for (const member of members) {
    recipients.push({
      recipientType: 'member',
      memberId: member.id,
      name: member.display_name?.trim() || member.email,
      email: member.email,
    })
  }

  return recipients
}

function mapAllocationRow(
  row: Database['public']['Tables']['entity_payout_allocations']['Row']
): PayoutAllocationRecord {
  return {
    id: row.id,
    recipientType: row.recipient_type,
    memberId: row.member_id,
    amountType: row.amount_type,
    amountValue: row.amount_value,
    startDate: row.start_date ?? '',
    endDate: row.end_date,
    recurrence: row.recurrence,
  }
}

function mapTransferRow(
  row: Database['public']['Tables']['entity_payout_transfers']['Row']
): PayoutTransferRecord {
  return {
    id: row.id,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    recipientType: row.recipient_type,
    memberId: row.member_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    revenueBasisCents: row.revenue_basis_cents,
    amountCents: row.amount_cents,
    status: row.status,
    scheduledAt: row.scheduled_at,
    exportedAt: row.exported_at,
    completedAt: row.completed_at,
    isOneTime: row.schedule_id == null,
  }
}

export async function getPayoutSchedule(
  client: Client,
  entityId: string
): Promise<PayoutScheduleRecord | null> {
  const { data: schedule, error } = await client
    .from('entity_payout_schedules')
    .select('*')
    .eq('entity_id', entityId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!schedule) return null

  const { data: allocations, error: allocError } = await client
    .from('entity_payout_allocations')
    .select('*')
    .eq('schedule_id', schedule.id)
    .order('created_at', { ascending: true })

  if (allocError) throw new Error(allocError.message)

  return {
    id: schedule.id,
    entityId: schedule.entity_id,
    recurrence: schedule.recurrence,
    isActive: schedule.is_active,
    nextRunAt: schedule.next_run_at,
    lastRunAt: schedule.last_run_at,
    allocations: (allocations ?? []).map(mapAllocationRow),
  }
}

export async function listPayoutTransfers(
  client: Client,
  entityId: string,
  limit = 20
): Promise<PayoutTransferRecord[]> {
  const { data, error } = await client
    .from('entity_payout_transfers')
    .select('*')
    .eq('entity_id', entityId)
    .order('scheduled_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTransferRow)
}

export async function upsertPayoutSchedule(
  client: Client,
  entityId: string,
  input: {
    isActive: boolean
    allocations: PayoutAllocationInput[]
  }
): Promise<PayoutScheduleRecord> {
  if (input.allocations.length === 0) {
    throw new Error('Ajoutez au moins un bénéficiaire avec un montant.')
  }

  const existing = await getPayoutSchedule(client, entityId)

  let scheduleId = existing?.id
  if (scheduleId) {
    const { error } = await client
      .from('entity_payout_schedules')
      .update({
        is_active: input.isActive,
      })
      .eq('id', scheduleId)
      .eq('entity_id', entityId)

    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await client
      .from('entity_payout_schedules')
      .insert({
        entity_id: entityId,
        recurrence: 'monthly',
        is_active: input.isActive,
        next_run_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    scheduleId = data.id
  }

  const rows = input.allocations.map((allocation) => ({
    schedule_id: scheduleId!,
    entity_id: entityId,
    recipient_type: allocation.recipientType,
    member_id: allocation.memberId,
    amount_type: allocation.amountType,
    amount_value: allocation.amountValue,
    start_date: allocation.startDate || undefined,
    end_date: allocation.endDate || undefined,
    recurrence: allocation.recurrence,
    next_run_at: parsePayoutStartDateInput(allocation.startDate).toISOString()
  }))

  if (rows.length > 0) {
    const { error: insertError } = await client
      .from('entity_payout_allocations')
      .upsert(rows, { onConflict: 'schedule_id,recipient_type,member_id' })

    if (insertError) throw new Error(insertError.message)
  }

  const { data: existingAllocs } = await client
    .from('entity_payout_allocations')
    .select('id, member_id, recipient_type')
    .eq('schedule_id', scheduleId!)
      
  if (existingAllocs) {
    const toDelete = existingAllocs.filter(ea => 
      !input.allocations.find(a => a.recipientType === ea.recipient_type && (a.memberId || null) === ea.member_id)
    )
      
    if (toDelete.length > 0) {
      await client
        .from('entity_payout_allocations')
        .delete()
        .in('id', toDelete.map(d => d.id))
    }
  }

  const saved = await getPayoutSchedule(client, entityId)
  if (!saved) throw new Error('Plan de virement introuvable après enregistrement.')
  return saved
}

export async function deletePayoutSchedule(client: Client, entityId: string) {
  const { error } = await client.from('entity_payout_schedules').delete().eq('entity_id', entityId)
  if (error) throw new Error(error.message)
}

function oneTimePeriodStart(runAt: Date): Date {
  return startOfDay(new Date(runAt.getFullYear(), runAt.getMonth(), 1))
}

export async function createOneTimePayoutTransfers(
  client: Client,
  entityId: string,
  allocations: PayoutAllocationInput[],
  owner: { name: string; email: string },
  runAt = new Date()
): Promise<PayoutTransferRecord[]> {
  if (allocations.length === 0) {
    throw new Error('Ajoutez au moins un bénéficiaire avec un montant.')
  }

  const periodStart = oneTimePeriodStart(runAt)
  const periodEnd = runAt
  const revenueBasisCents = await getEntityRevenueCentsInWindow(
    client,
    entityId,
    periodStart,
    periodEnd
  )

  const transferRows = []
  for (const allocation of allocations) {
    const recipient = await resolveRecipient(client, entityId, allocation, owner)
    const amountCents = computeAllocationAmountCents(allocation, revenueBasisCents)
    if (amountCents <= 0) continue

    transferRows.push({
      entity_id: entityId,
      schedule_id: null,
      allocation_id: null,
      recipient_type: allocation.recipientType,
      member_id: allocation.memberId,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      revenue_basis_cents: revenueBasisCents,
      amount_cents: amountCents,
      status: 'pending' as const,
      scheduled_at: runAt.toISOString(),
    })
  }

  if (transferRows.length === 0) {
    throw new Error('Aucun montant calculé — vérifiez les montants saisis.')
  }

  const { data, error } = await client
    .from('entity_payout_transfers')
    .insert(transferRows)
    .select('*')

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTransferRow)
}

async function resolveRecipient(
  client: Client,
  entityId: string,
  allocation: PayoutAllocationInput,
  owner: { name: string; email: string }
): Promise<PayoutRecipient> {
  if (allocation.recipientType === 'owner') {
    return {
      recipientType: 'owner',
      memberId: null,
      name: owner.name,
      email: owner.email,
    }
  }

  const { data, error } = await client
    .from('entity_team_members')
    .select('id, email, display_name')
    .eq('entity_id', entityId)
    .eq('id', allocation.memberId ?? '')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Membre introuvable pour le virement.')

  return {
    recipientType: 'member',
    memberId: data.id,
    name: data.display_name?.trim() || data.email,
    email: data.email,
  }
}

export async function runPayoutAllocation(
  client: Client,
  allocationRow: any, // On utilise row raw issue de listDuePayoutAllocations
  runAt = new Date()
): Promise<{ transferCount: number }> {
  // on appelle le backend pour générer le virement de cette allocation
  const { data: entity, error: entityError } = await client
    .from('entity')
    .select('id, display_name, user_id')
    .eq('id', allocationRow.entity_id)
    .single()

  if (entityError) throw new Error(entityError.message)
  if (!entity.user_id) throw new Error('Propriétaire introuvable pour le virement.')

  const { data: ownerUser, error: ownerError } = await client.auth.admin.getUserById(entity.user_id)
  if (ownerError) throw new Error(ownerError.message)

  const owner = {
    name: entity.display_name,
    email: ownerUser.user?.email ?? '',
  }

  const runAtStr = formatPayoutStartDateInput(runAt)

  // Verify dates
  const isStarted = allocationRow.start_date === null || allocationRow.start_date <= runAtStr
  const isEnded = allocationRow.end_date !== null && allocationRow.end_date < runAtStr

  if (!isStarted || isEnded) {
    // Si c'est terminé ou pas commencé, on met juste à jour next_run_at si pas terminé
    if (isEnded) {
       // plus rien à faire, on pourrait même le désactiver
       return { transferCount: 0 }
    }
    // Pas encore commencé: on décale next_run_at?
    // Normalement next_run_at = start_date, donc ça ne devrait pas être récupéré avant
    return { transferCount: 0 }
  }

  const periodStart = periodStartForRun(allocationRow.recurrence, allocationRow.last_run_at, runAt)
  const periodEnd = runAt
  const revenueBasisCents = await getEntityRevenueCentsInWindow(
    client,
    allocationRow.entity_id,
    periodStart,
    periodEnd
  )

  const allocation = mapAllocationRow(allocationRow)
  const recipient = await resolveRecipient(client, allocationRow.entity_id, allocation, owner)
  const amountCents = computeAllocationAmountCents(allocation, revenueBasisCents)
  
  if (amountCents > 0) {
    const transferRow = {
      entity_id: allocationRow.entity_id,
      schedule_id: allocationRow.schedule_id,
      allocation_id: allocationRow.id,
      recipient_type: allocationRow.recipient_type,
      member_id: allocationRow.member_id,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      revenue_basis_cents: revenueBasisCents,
      amount_cents: amountCents,
      status: 'pending' as const,
      scheduled_at: runAt.toISOString(),
    }

    const { error: insertError } = await client.from('entity_payout_transfers').insert([transferRow])
    if (insertError) throw new Error(insertError.message)
  }

  // Mettre à jour last_run_at et next_run_at
  const { error: updateError } = await client
    .from('entity_payout_allocations')
    .update({
      last_run_at: runAt.toISOString(),
      next_run_at: addRecurrence(runAt, allocationRow.recurrence).toISOString(),
    })
    .eq('id', allocationRow.id)

  if (updateError) throw new Error(updateError.message)

  return { transferCount: amountCents > 0 ? 1 : 0 }
}

export async function listDuePayoutSchedules(client: Client, before = new Date()) {
  const { data, error } = await client
    .from('entity_payout_schedules')
    .select('id')
    .eq('is_active', true)
    .lte('next_run_at', before.toISOString())

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function runDuePayoutSchedules(client: Client, before = new Date()) {
  const dueAllocations = await listDuePayoutAllocations(client, before)
  let transferCount = 0
  
  // Group allocations by schedule_id to avoid calling runPayoutSchedule multiple times 
  // for the same entity if we can batch it, or we can just run runPayoutAllocation
  // Since we refactored, we should run per-allocation.
  
  for (const allocation of dueAllocations) {
    const result = await runPayoutAllocation(client, allocation, before)
    transferCount += result.transferCount
  }
  return { allocationsProcessed: dueAllocations.length, transferCount }
}

async function listDuePayoutAllocations(client: Client, before: Date) {
  const { data, error } = await client
    .from('entity_payout_allocations')
    .select('*, schedule:entity_payout_schedules!inner(is_active)')
    .eq('schedule.is_active', true)
    .lte('next_run_at', before.toISOString())

  if (error) throw new Error(error.message)
  return data
}



export async function markPayoutTransfersExported(
  client: Client,
  entityId: string,
  transferIds: string[]
) {
  if (transferIds.length === 0) return
  const now = new Date().toISOString()
  const { error } = await client
    .from('entity_payout_transfers')
    .update({ status: 'exported', exported_at: now })
    .eq('entity_id', entityId)
    .in('id', transferIds)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
}

export async function markPayoutTransfersCompleted(
  client: Client,
  entityId: string,
  transferIds: string[]
) {
  if (transferIds.length === 0) return
  const now = new Date().toISOString()
  const { error } = await client
    .from('entity_payout_transfers')
    .update({ status: 'completed', completed_at: now })
    .eq('entity_id', entityId)
    .in('id', transferIds)
    .in('status', ['pending', 'exported'])

  if (error) throw new Error(error.message)
}

export async function getCommittedTeamPayoutCents(client: Client, entityId: string): Promise<number> {
  const { data, error } = await client
    .from('entity_payout_transfers')
    .select('amount_cents')
    .eq('entity_id', entityId)
    .neq('status', 'cancelled')

  if (error) throw new Error(error.message)
  return (data ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0)
}

export async function getProjectAvailableBalanceCents(
  client: Client,
  entityId: string
): Promise<number> {
  const [revenueCents, payoutCents] = await Promise.all([
    getEntityRevenueCentsInWindow(client, entityId, new Date(0), new Date()),
    getCommittedTeamPayoutCents(client, entityId),
  ])

  return Math.max(0, revenueCents - payoutCents)
}

export async function listProjectExpenses(client: Client, entityId: string): Promise<ProjectExpenseRecord[]> {
  const { data, error } = await client
    .from('entity_expenses')
    .select('*')
    .eq('entity_id', entityId)
    .order('incurred_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    amountCents: row.amount_cents,
    description: row.description,
    status: row.status,
    incurredAt: row.incurred_at,
  }))
}

export async function getProjectPayoutSnapshot(
  client: Client,
  entityId: string,
  owner: { name: string; email: string }
): Promise<ProjectPayoutSnapshot> {
  const [schedule, transfers, expenses, recipients, availableBalanceCents] = await Promise.all([
    getPayoutSchedule(client, entityId),
    listPayoutTransfers(client, entityId),
    listProjectExpenses(client, entityId),
    listPayoutRecipients(client, entityId, owner),
    getProjectAvailableBalanceCents(client, entityId),
  ])

  const nextPayoutLabel = schedule?.isActive
    ? `Prochain virement ${RECURRENCE_LABELS[schedule.recurrence]} le ${new Date(schedule.nextRunAt).toLocaleDateString('fr-FR')}`
    : null

  return { schedule, transfers, expenses, recipients, nextPayoutLabel, availableBalanceCents }
}

export function buildPayoutTransfersCsv(transfers: PayoutTransferRecord[]): string {
  const header = [
    'Date prévue',
    'Nom',
    'Email',
    'Montant EUR',
    'Période début',
    'Période fin',
    'Base CA EUR',
    'Statut',
    'Référence',
  ]

  const rows = transfers.map((transfer) => [
    new Date(transfer.scheduledAt).toLocaleDateString('fr-FR'),
    transfer.recipientName,
    transfer.recipientEmail,
    (transfer.amountCents / 100).toFixed(2).replace('.', ','),
    new Date(transfer.periodStart).toLocaleDateString('fr-FR'),
    new Date(transfer.periodEnd).toLocaleDateString('fr-FR'),
    (transfer.revenueBasisCents / 100).toFixed(2).replace('.', ','),
    transfer.status,
    transfer.id,
  ])

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  return [header, ...rows].map((line) => line.map(escape).join(';')).join('\r\n')
}

export function formatPayoutTransferAmount(cents: number): string {
  const value = (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `- ${value} €`
}

export function payoutTransferStatusLabel(status: PayoutTransferStatus): string {
  switch (status) {
    case 'pending':
      return 'À exporter'
    case 'exported':
      return 'Exporté'
    case 'completed':
      return 'Effectué'
    case 'cancelled':
      return 'Annulé'
    default:
      return status
  }
}
