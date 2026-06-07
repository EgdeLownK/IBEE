import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'
import {
  listEntityFiles,
  getEntityFileById,
  createEntityFile,
} from '../entity-files'

type Client = SupabaseClient<Database>

type MockResponse = { data: unknown; error: unknown }

// Chainable mock : toutes les méthodes intermédiaires retournent le chainable,
// et l'objet est lui-même thenable pour qu'`await query` résolve la réponse.
function createMockClient(response: MockResponse) {
  const chainable: Record<string, unknown> = {
    then: (resolve: (value: MockResponse) => unknown) => resolve(response),
  }
  for (const m of ['select', 'eq', 'order', 'insert']) {
    chainable[m] = vi.fn().mockReturnValue(chainable)
  }
  chainable.maybeSingle = vi.fn().mockResolvedValue(response)
  chainable.single = vi.fn().mockResolvedValue(response)

  const fromMock = vi.fn().mockReturnValue(chainable)
  const client = { from: fromMock } as unknown as Client
  return { client, fromMock, chainable }
}

const FILE_ROW = {
  id: 'f1',
  entity_id: 'e1',
  name: 'guide.pdf',
  storage_path: 'u1/123-guide.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
  created_at: '2026-06-04T00:00:00Z',
}

describe('listEntityFiles', () => {
  it('returns files for an entity', async () => {
    const { client } = createMockClient({ data: [FILE_ROW], error: null })
    const result = await listEntityFiles(client, 'e1')
    expect(result).toEqual([FILE_ROW])
  })

  it('returns empty array when no files', async () => {
    const { client } = createMockClient({ data: null, error: null })
    const result = await listEntityFiles(client, 'e1')
    expect(result).toEqual([])
  })

  it('scopes query by entity_id and orders by created_at desc', async () => {
    const { client, fromMock, chainable } = createMockClient({ data: [], error: null })
    await listEntityFiles(client, 'e1')
    expect(fromMock).toHaveBeenCalledWith('entity_files')
    expect(chainable.eq).toHaveBeenCalledWith('entity_id', 'e1')
    expect(chainable.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('throws on error', async () => {
    const { client } = createMockClient({ data: null, error: new Error('DB error') })
    await expect(listEntityFiles(client, 'e1')).rejects.toThrow('DB error')
  })
})

describe('getEntityFileById', () => {
  it('returns the file when found', async () => {
    const { client } = createMockClient({ data: FILE_ROW, error: null })
    const result = await getEntityFileById(client, 'f1')
    expect(result).toEqual(FILE_ROW)
  })

  it('returns null when not found (maybeSingle)', async () => {
    const { client, chainable } = createMockClient({ data: null, error: null })
    const result = await getEntityFileById(client, 'missing')
    expect(result).toBeNull()
    expect(chainable.maybeSingle).toHaveBeenCalled()
  })

  it('throws on error', async () => {
    const { client } = createMockClient({ data: null, error: new Error('DB error') })
    await expect(getEntityFileById(client, 'f1')).rejects.toThrow('DB error')
  })
})

describe('createEntityFile', () => {
  it('inserts and returns the created row', async () => {
    const { client, chainable } = createMockClient({ data: FILE_ROW, error: null })
    const input = {
      entity_id: 'e1',
      name: 'guide.pdf',
      storage_path: 'u1/123-guide.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024,
    }
    const result = await createEntityFile(client, input)
    expect(chainable.insert).toHaveBeenCalledWith(input)
    expect(result).toEqual(FILE_ROW)
  })

  it('throws on error', async () => {
    const { client } = createMockClient({ data: null, error: new Error('insert failed') })
    await expect(
      createEntityFile(client, {
        entity_id: 'e1',
        name: 'x',
        storage_path: 'u1/x',
        size_bytes: 0,
      })
    ).rejects.toThrow('insert failed')
  })
})
