import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type Client = Database['public']['Tables']['clients']['Row']

export async function getClientsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { search?: string } = {}
): Promise<Client[]> {
  let query = client
    .from('clients')
    .select('*')
    .eq('entity_id', entityId)
    .order('last_booking_at', { ascending: false, nullsFirst: false })

  if (opts.search && opts.search.trim() !== '') {
    const s = `%${opts.search.trim()}%`
    query = query.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s}`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getClientById(
  client: SupabaseClient<Database>,
  id: string
): Promise<Client | null> {
  const { data, error } = await client
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getClientBookings(
  client: SupabaseClient<Database>,
  clientId: string
) {
  const { data, error } = await client
    .from('bookings')
    .select(
      '*, appointment_types(title, duration_minutes, location_type, location_details, color, price_cents, promo_price_cents)'
    )
    .eq('client_id', clientId)
    .order('start_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function updateClient(
  client: SupabaseClient<Database>,
  id: string,
  data: Partial<{
    name: string
    phone: string | null
    notes: string | null
    tags: string[]
  }>
): Promise<Client> {
  const { data: result, error } = await client
    .from('clients')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result
}

export async function getBannedClientsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { search?: string } = {}
): Promise<Client[]> {
  let query = client
    .from('clients')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_banned', true)
    .order('banned_at', { ascending: false, nullsFirst: false })

  if (opts.search && opts.search.trim() !== '') {
    const s = `%${opts.search.trim()}%`
    query = query.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s}`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function isEntityEmailBanned(
  client: SupabaseClient<Database>,
  entityId: string,
  email: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const { data, error } = await client
    .from('clients')
    .select('is_banned')
    .eq('entity_id', entityId)
    .eq('email', normalized)
    .maybeSingle()

  if (error) throw error
  return data?.is_banned === true
}

export async function banClientByEmail(
  client: SupabaseClient<Database>,
  input: {
    entityId: string
    email: string
    name?: string
    phone?: string | null
  }
): Promise<Client> {
  const { data, error } = await client.rpc('ban_entity_client', {
    p_entity_id: input.entityId,
    p_email: input.email,
    p_name: input.name ?? '',
    p_phone: input.phone ?? undefined,
  })

  if (error) throw error
  return data as Client
}

export async function unbanClient(
  client: SupabaseClient<Database>,
  entityId: string,
  clientId: string
): Promise<Client> {
  const { data, error } = await client.rpc('unban_entity_client', {
    p_entity_id: entityId,
    p_client_id: clientId,
  })

  if (error) throw error
  return data as Client
}

export async function deleteClient(
  client: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const { error } = await client.from('clients').delete().eq('id', id)
  if (error) throw error
}
