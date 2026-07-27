import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'
import { getActiveJobOffer } from '../project-talent'

type Client = SupabaseClient<Database>

function createMockClient(response: { data: unknown; error: unknown }): Client {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(response),
          }),
        }),
      }),
    }),
  } as unknown as Client
}

describe('getActiveJobOffer', () => {
  it('retourne l’offre quand elle existe et est active', async () => {
    const mockOffer = { id: 'offer-1', status: 'active', title: 'Dev' }
    const client = createMockClient({ data: mockOffer, error: null })

    const result = await getActiveJobOffer(client, 'offer-1')
    expect(result).toEqual(mockOffer)
  })

  it('retourne null pour une offre inexistante (id inconnu ou supprimée)', async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await getActiveJobOffer(client, 'unknown-offer')
    expect(result).toBeNull()
  })

  it('retourne null pour une offre fermée (filtrée par status = active)', async () => {
    // Le mock ne differencie pas "aucune ligne" de "ligne existante mais
    // status != active" : le filtre .eq('status', 'active') fait ce travail
    // cote base reelle, et produit dans les deux cas data: null ici.
    const client = createMockClient({ data: null, error: null })

    const result = await getActiveJobOffer(client, 'closed-offer')
    expect(result).toBeNull()
  })

  it('propage une erreur Postgres inattendue', async () => {
    const client = createMockClient({ data: null, error: new Error('DB error') })

    await expect(getActiveJobOffer(client, 'offer-1')).rejects.toThrow('DB error')
  })
})
