import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type ManualRegContactSessionRow = {
  id: string
  entity_id: string
  event_id: string
  token: string
  attendee_name: string | null
  attendee_email: string | null
  attendee_phone: string | null
  status: string
  filled_at: string | null
  consumed_at: string | null
  expires_at: string
  created_at: string
}

function manualRegSessions(client: SupabaseClient<Database>) {
  // Table absente des types générés tant que la migration n'est pas appliquée + regen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as unknown as SupabaseClient<any>).from('event_manual_reg_contact_sessions')
}

export type ManualRegContactSession = {
  id: string
  entityId: string
  eventId: string
  token: string
  attendeeName: string | null
  attendeeEmail: string | null
  attendeePhone: string | null
  status: 'pending' | 'filled' | 'consumed' | 'expired'
  filledAt: string | null
  consumedAt: string | null
  expiresAt: string
  createdAt: string
}

export type ManualRegContactSessionPublic = {
  eventTitle: string
  entityName: string
  status: 'pending' | 'filled'
}

function mapSession(row: ManualRegContactSessionRow): ManualRegContactSession {
  return {
    id: row.id,
    entityId: row.entity_id,
    eventId: row.event_id,
    token: row.token,
    attendeeName: row.attendee_name,
    attendeeEmail: row.attendee_email,
    attendeePhone: row.attendee_phone,
    status: row.status as ManualRegContactSession['status'],
    filledAt: row.filled_at,
    consumedAt: row.consumed_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

export async function createManualRegContactSession(
  client: SupabaseClient<Database>,
  input: {
    entityId: string
    eventId: string
    token: string
    createdBy: string
    expiresAt: string
  }
): Promise<ManualRegContactSession> {
  const { data, error } = await manualRegSessions(client)
    .insert({
      entity_id: input.entityId,
      event_id: input.eventId,
      token: input.token,
      created_by: input.createdBy,
      expires_at: input.expiresAt,
      status: 'pending',
    } as never)
    .select('*')
    .single()

  if (error) throw error
  return mapSession(data as ManualRegContactSessionRow)
}

export async function getManualRegContactSessionByToken(
  client: SupabaseClient<Database>,
  token: string
): Promise<ManualRegContactSession | null> {
  const { data, error } = await manualRegSessions(client)
    .select('*')
    .eq('token', token.trim())
    .maybeSingle()

  if (error) throw error
  return data ? mapSession(data as ManualRegContactSessionRow) : null
}

export async function getManualRegContactSessionById(
  client: SupabaseClient<Database>,
  sessionId: string
): Promise<ManualRegContactSession | null> {
  const { data, error } = await manualRegSessions(client)
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) throw error
  return data ? mapSession(data as ManualRegContactSessionRow) : null
}

export async function consumeManualRegContactSession(
  client: SupabaseClient<Database>,
  sessionId: string
): Promise<void> {
  const { error } = await manualRegSessions(client)
    .update({
      status: 'consumed',
      consumed_at: new Date().toISOString(),
    } as never)
    .eq('id', sessionId)

  if (error) throw error
}

export async function getManualRegContactSessionPublic(
  client: SupabaseClient<Database>,
  token: string
): Promise<ManualRegContactSessionPublic | null> {
  const { data, error } = await client
    .rpc('get_manual_reg_contact_session_public', {
      p_token: token.trim(),
    })

  if (error) throw error
  if (!data || typeof data !== 'object') return null

  const payload = data as Record<string, unknown>
  if (typeof payload.event_title !== 'string' || typeof payload.entity_name !== 'string') {
    return null
  }

  return {
    eventTitle: payload.event_title,
    entityName: payload.entity_name,
    status: payload.status === 'filled' ? 'filled' : 'pending',
  }
}

export async function submitManualRegContactSession(
  client: SupabaseClient<Database>,
  input: { token: string; name: string; email: string; phone?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client
    .rpc('submit_manual_reg_contact_session', {
      p_token: input.token.trim(),
      p_name: input.name.trim(),
      p_email: input.email.trim(),
      p_phone: input.phone?.trim() || undefined,
    })

  if (error) throw error

  const payload = data as { ok?: boolean; error?: string } | null
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? 'Envoi impossible.' }
  }

  return { ok: true }
}
