import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'
import {
  getClientsByEntity,
  getClientById,
  getClientBookings,
  updateClient,
  deleteClient,
} from '../clients'

type Client = SupabaseClient<Database>

type MockResponse = { data: unknown; error: unknown }

// Chainable mock : toutes les méthodes intermédiaires retournent le chainable,
// et l'objet est lui-même thenable pour qu'`await query` résolve la réponse.
function createMockClient(response: MockResponse) {
  const chainable: Record<string, unknown> = {
    then: (resolve: (value: MockResponse) => unknown) => resolve(response),
  }
  for (const m of ['select', 'eq', 'or', 'order', 'update', 'delete', 'insert']) {
    chainable[m] = vi.fn().mockReturnValue(chainable)
  }
  chainable.maybeSingle = vi.fn().mockResolvedValue(response)
  chainable.single = vi.fn().mockResolvedValue(response)

  const fromMock = vi.fn().mockReturnValue(chainable)
  const client = { from: fromMock } as unknown as Client
  return { client, fromMock, chainable }
}

describe('getClientsByEntity', () => {
  it('returns clients for an entity', async () => {
    const rows = [
      { id: 'c1', entity_id: 'e1', name: 'Alice', email: 'a@x.fr' },
      { id: 'c2', entity_id: 'e1', name: 'Bob', email: 'b@x.fr' },
    ]
    const { client } = createMockClient({ data: rows, error: null })

    const result = await getClientsByEntity(client, 'e1')
    expect(result).toEqual(rows)
  })

  it('returns empty array when no clients', async () => {
    const { client } = createMockClient({ data: null, error: null })

    const result = await getClientsByEntity(client, 'e1')
    expect(result).toEqual([])
  })

  it('applies search filter when provided', async () => {
    const { client, chainable } = createMockClient({ data: [], error: null })

    await getClientsByEntity(client, 'e1', { search: 'Alice' })
    expect(chainable.or).toHaveBeenCalledWith(
      expect.stringContaining('name.ilike.%Alice%')
    )
  })

  it('skips search filter when search is whitespace', async () => {
    const { client, chainable } = createMockClient({ data: [], error: null })

    await getClientsByEntity(client, 'e1', { search: '   ' })
    expect(chainable.or).not.toHaveBeenCalled()
  })

  it('scopes query by entity_id', async () => {
    const { client, chainable } = createMockClient({ data: [], error: null })

    await getClientsByEntity(client, 'e1')
    expect(chainable.eq).toHaveBeenCalledWith('entity_id', 'e1')
  })

  it('throws on error', async () => {
    const { client } = createMockClient({
      data: null,
      error: new Error('DB error'),
    })

    await expect(getClientsByEntity(client, 'e1')).rejects.toThrow('DB error')
  })
})

describe('getClientById', () => {
  it('returns a client when found', async () => {
    const row = { id: 'c1', entity_id: 'e1', name: 'Alice' }
    const { client } = createMockClient({ data: row, error: null })

    const result = await getClientById(client, 'c1')
    expect(result).toEqual(row)
  })

  it('returns null when not found', async () => {
    const { client } = createMockClient({ data: null, error: null })

    const result = await getClientById(client, 'missing')
    expect(result).toBeNull()
  })

  it('throws on error', async () => {
    const { client } = createMockClient({
      data: null,
      error: new Error('DB error'),
    })

    await expect(getClientById(client, 'c1')).rejects.toThrow('DB error')
  })
})

describe('getClientBookings', () => {
  it('returns bookings for a client', async () => {
    const rows = [
      { id: 'b1', client_id: 'c1', start_at: '2026-01-01T09:00:00Z' },
      { id: 'b2', client_id: 'c1', start_at: '2026-01-02T10:00:00Z' },
    ]
    const { client } = createMockClient({ data: rows, error: null })

    const result = await getClientBookings(client, 'c1')
    expect(result).toEqual(rows)
  })

  it('returns empty array when no bookings', async () => {
    const { client } = createMockClient({ data: null, error: null })

    const result = await getClientBookings(client, 'c1')
    expect(result).toEqual([])
  })

  it('filters by client_id', async () => {
    const { client, chainable } = createMockClient({ data: [], error: null })

    await getClientBookings(client, 'c1')
    expect(chainable.eq).toHaveBeenCalledWith('client_id', 'c1')
  })

  it('throws on error', async () => {
    const { client } = createMockClient({
      data: null,
      error: new Error('DB error'),
    })

    await expect(getClientBookings(client, 'c1')).rejects.toThrow('DB error')
  })
})

describe('updateClient', () => {
  it('returns updated client', async () => {
    const updated = { id: 'c1', name: 'Alice Updated', tags: ['VIP'] }
    const { client } = createMockClient({ data: updated, error: null })

    const result = await updateClient(client, 'c1', {
      name: 'Alice Updated',
      tags: ['VIP'],
    })
    expect(result).toEqual(updated)
  })

  it('passes update payload to supabase', async () => {
    const { client, chainable } = createMockClient({
      data: { id: 'c1' },
      error: null,
    })
    const payload = { name: 'Alice', phone: null, notes: 'VIP', tags: ['pro'] }

    await updateClient(client, 'c1', payload)
    expect(chainable.update).toHaveBeenCalledWith(payload)
    expect(chainable.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('throws on error', async () => {
    const { client } = createMockClient({
      data: null,
      error: new Error('RLS denied'),
    })

    await expect(
      updateClient(client, 'c1', { name: 'X' })
    ).rejects.toThrow('RLS denied')
  })
})

describe('deleteClient', () => {
  it('resolves when delete succeeds', async () => {
    const { client } = createMockClient({ data: null, error: null })

    await expect(deleteClient(client, 'c1')).resolves.toBeUndefined()
  })

  it('targets the correct row', async () => {
    const { client, chainable } = createMockClient({ data: null, error: null })

    await deleteClient(client, 'c1')
    expect(chainable.delete).toHaveBeenCalled()
    expect(chainable.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('throws on error', async () => {
    const { client } = createMockClient({
      data: null,
      error: new Error('RLS denied'),
    })

    await expect(deleteClient(client, 'c1')).rejects.toThrow('RLS denied')
  })
})
