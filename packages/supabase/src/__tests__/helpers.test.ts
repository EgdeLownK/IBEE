import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'
import {
  getEntityBySlug,
  getEntityByUserId,
  getEntityMenuSections,
  getEntityHomeWidgets,
} from '../helpers'

type Client = SupabaseClient<Database>

function createMockClient(response: { data: unknown; error: unknown }): Client {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(response),
            maybeSingle: vi.fn().mockResolvedValue(response),
          }),
          maybeSingle: vi.fn().mockResolvedValue(response),
        }),
      }),
    }),
  } as unknown as Client
}

describe('getEntityBySlug', () => {
  it('returns entity data when found', async () => {
    const mockEntity = { id: '1', slug: 'test', display_name: 'Test' }
    const client = createMockClient({ data: mockEntity, error: null })

    const result = await getEntityBySlug(client, 'test')
    expect(result).toEqual(mockEntity)
  })

  it('returns null when not found', async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await getEntityBySlug(client, 'nonexistent')
    expect(result).toBeNull()
  })

  it('throws on error', async () => {
    const client = createMockClient({ data: null, error: new Error('DB error') })

    await expect(getEntityBySlug(client, 'test')).rejects.toThrow('DB error')
  })
})

describe('getEntityByUserId', () => {
  it('returns entity for user', async () => {
    const mockEntity = { id: '1', user_id: 'u1', slug: 'test' }
    const client = createMockClient({ data: mockEntity, error: null })

    const result = await getEntityByUserId(client, 'u1')
    expect(result).toEqual(mockEntity)
  })

  it('returns null for unknown user', async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await getEntityByUserId(client, 'unknown')
    expect(result).toBeNull()
  })
})

describe('getEntityMenuSections', () => {
  it('returns ordered menu sections', async () => {
    const mockSections = [
      { id: '1', position: 0, is_active: true },
      { id: '2', position: 1, is_active: true },
    ]
    const client = createMockClient({ data: mockSections, error: null })

    const result = await getEntityMenuSections(client, 'entity-1')
    expect(result).toEqual(mockSections)
  })

  it('returns empty array when no sections', async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await getEntityMenuSections(client, 'entity-1')
    expect(result).toEqual([])
  })
})

describe('getEntityHomeWidgets', () => {
  it('returns ordered widgets', async () => {
    const mockWidgets = [{ id: '1', position: 0, is_active: true }]
    const client = createMockClient({ data: mockWidgets, error: null })

    const result = await getEntityHomeWidgets(client, 'entity-1')
    expect(result).toEqual(mockWidgets)
  })

  it('returns empty array when no widgets', async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await getEntityHomeWidgets(client, 'entity-1')
    expect(result).toEqual([])
  })
})
