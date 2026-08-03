import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'
import {
  getActiveJobOffer,
  createJobApplication,
  addJobOfferMedia,
  listJobOfferMedia,
  listOtherActiveJobOffersByEntity,
  listSimilarActiveJobOffersBySector,
} from '../project-talent'

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

describe('createJobApplication', () => {
  // Preuve : une candidature creee porte le session_number courant de
  // l'offre (fige par apply-actions.ts a partir de offer.session_count,
  // jamais recalcule cote base) - voir apps/platform/.../apply-actions.ts.
  it('transmet le session_number recu a l’insert, sans le recalculer', async () => {
    const insertedRow = {
      id: 'app-1',
      offer_id: 'offer-1',
      session_number: 3,
    }
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
      }),
    })
    const client = {
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as SupabaseClient<Database>

    const result = await createJobApplication(client, {
      offer_id: 'offer-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      session_number: 3,
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ offer_id: 'offer-1', session_number: 3 }),
    )
    expect(result.session_number).toBe(3)
  })
})

describe('addJobOfferMedia', () => {
  // Meme choix que addProductMedia (products.ts) : display_order derive de
  // la position dans le tableau quand non fourni explicitement.
  it('derive display_order de la position quand non fourni', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    const client = {
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as SupabaseClient<Database>

    await addJobOfferMedia(client, 'offer-1', [
      { url: 'https://x.test/a.jpg', media_type: 'image' },
      { url: 'https://x.test/b.jpg', media_type: 'image' },
    ])

    expect(insertMock).toHaveBeenCalledWith([
      { url: 'https://x.test/a.jpg', media_type: 'image', offer_id: 'offer-1', display_order: 0 },
      { url: 'https://x.test/b.jpg', media_type: 'image', offer_id: 'offer-1', display_order: 1 },
    ])
  })
})

describe('listJobOfferMedia', () => {
  it('trie par display_order croissant', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [{ id: 'm1', display_order: 0 }],
      error: null,
    })
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ order: orderMock }),
        }),
      }),
    } as unknown as SupabaseClient<Database>

    await listJobOfferMedia(client, 'offer-1')

    expect(orderMock).toHaveBeenCalledWith('display_order', { ascending: true })
  })
})

describe('listOtherActiveJobOffersByEntity', () => {
  // Section "Autres offres de ce profil" (PublicJobOfferDetail.tsx) :
  // preuve que la requete exclut bien l'offre courante et ne demande que
  // les offres actives -- .eq('status', 'active') est le filtre applicatif,
  // complementaire au RLS entity_job_offers_public_select (qui refuse deja
  // toute lecture d'une offre inactive a anon/authenticated, quelle que
  // soit l'entite proprietaire -- voir .claude/rules/database.md).
  it('filtre entity_id, status=active, exclut l’offre courante et applique la limite', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [{ id: 'offer-2', entity_id: 'entity-a', status: 'active' }],
      error: null,
    })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const neqMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqStatusMock = vi.fn().mockReturnValue({ neq: neqMock })
    const eqEntityMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqEntityMock }),
      }),
    } as unknown as SupabaseClient<Database>

    const result = await listOtherActiveJobOffersByEntity(client, 'entity-a', 'offer-1', 4)

    expect(eqEntityMock).toHaveBeenCalledWith('entity_id', 'entity-a')
    expect(eqStatusMock).toHaveBeenCalledWith('status', 'active')
    expect(neqMock).toHaveBeenCalledWith('id', 'offer-1')
    expect(limitMock).toHaveBeenCalledWith(4)
    expect(result).toHaveLength(1)
  })
})

describe('listSimilarActiveJobOffersBySector', () => {
  // PREUVE EXIGEE (mission feat/job-offer-related-content) : une offre
  // INACTIVE d'une autre entite n'apparait jamais dans les "offres
  // similaires". La requete construit explicitement .eq('status', 'active')
  // -- filtre applicatif en defense en profondeur, le RLS
  // entity_job_offers_public_select (qual: status = 'active', roles
  // anon/authenticated, PAS scopee par entite) est la source de verite
  // reelle qui empeche cette lecture cote base, quelle que soit l'entite
  // proprietaire de l'offre inactive.
  it('filtre sector_id, status=active, exclut l’entite courante et applique la limite', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'offer-similar-1',
          entity_id: 'entity-b',
          status: 'active',
          sector_id: 'sector-1',
          entity: { slug: 'entite-b', display_name: 'Entité B' },
        },
      ],
      error: null,
    })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const neqMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqStatusMock = vi.fn().mockReturnValue({ neq: neqMock })
    const eqSectorMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqSectorMock }),
      }),
    } as unknown as SupabaseClient<Database>

    const result = await listSimilarActiveJobOffersBySector(client, 'sector-1', 'entity-a', 4)

    expect(eqSectorMock).toHaveBeenCalledWith('sector_id', 'sector-1')
    expect(eqStatusMock).toHaveBeenCalledWith('status', 'active')
    expect(neqMock).toHaveBeenCalledWith('entity_id', 'entity-a')
    expect(limitMock).toHaveBeenCalledWith(4)
    expect(result).toHaveLength(1)
    expect(result[0]!.entity).toEqual({ slug: 'entite-b', display_name: 'Entité B' })
  })
})
