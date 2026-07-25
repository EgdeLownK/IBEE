import type { Client } from '@ibee/supabase'

export type BannedClientView = {
  id: string
  name: string
  email: string
  phone: string | null
  bannedAt: string | null
}

export function mapBannedClientToView(client: Client): BannedClientView {
  return {
    id: client.id,
    name: client.name.trim() || client.email,
    email: client.email,
    phone: client.phone,
    bannedAt: client.banned_at,
  }
}

export function searchBannedClients(
  clients: BannedClientView[],
  query: string,
): BannedClientView[] {
  const q = query.trim().toLowerCase()
  if (!q) return clients

  return clients.filter(
    (client) =>
      client.name.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      (client.phone?.toLowerCase().includes(q) ?? false),
  )
}

export function isEmailBanned(bannedClients: BannedClientView[], email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return bannedClients.some((client) => client.email.toLowerCase() === normalized)
}

export function findBannedClientByEmail(
  bannedClients: BannedClientView[],
  email: string,
): BannedClientView | null {
  const normalized = email.trim().toLowerCase()
  return bannedClients.find((client) => client.email.toLowerCase() === normalized) ?? null
}
