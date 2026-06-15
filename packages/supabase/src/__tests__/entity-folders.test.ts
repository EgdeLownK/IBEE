import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'
import { listAllEntityFolders, listEntityFolders } from '../entity-folders'

type Client = SupabaseClient<Database>
type MockResponse = { data: unknown; error: unknown }

function createMockClient(response: MockResponse) {
  const chainable: Record<string, unknown> = {
    then: (resolve: (value: MockResponse) => unknown) => resolve(response),
  }
  for (const m of ['select', 'eq', 'order', 'is']) {
    chainable[m] = vi.fn().mockReturnValue(chainable)
  }

  const fromMock = vi.fn().mockReturnValue(chainable)
  const client = { from: fromMock } as unknown as Client
  return { client, fromMock, chainable }
}

const FOLDER_ROW = {
  id: 'folder-1',
  entity_id: 'e1',
  parent_id: null,
  name: 'Produits digitaux',
  created_at: '2026-06-16T00:00:00Z',
  updated_at: '2026-06-16T00:00:00Z',
}

describe('listEntityFolders', () => {
  it('lists root folders for an entity', async () => {
    const { client } = createMockClient({ data: [FOLDER_ROW], error: null })
    const result = await listEntityFolders(client, 'e1')
    expect(result).toEqual([FOLDER_ROW])
  })

  it('filters by parent_id when provided', async () => {
    const { client, chainable } = createMockClient({ data: [], error: null })
    await listEntityFolders(client, 'e1', 'folder-1')
    expect(chainable.eq).toHaveBeenCalledWith('parent_id', 'folder-1')
  })
})

describe('listAllEntityFolders', () => {
  it('returns every folder for an entity', async () => {
    const { client, fromMock } = createMockClient({ data: [FOLDER_ROW], error: null })
    const result = await listAllEntityFolders(client, 'e1')
    expect(fromMock).toHaveBeenCalledWith('entity_folders')
    expect(result).toEqual([FOLDER_ROW])
  })
})
