import { describe, expect, it, vi, beforeEach } from 'vitest'

// PREUVE PHASE 1 (mission fix/talent-actions-auth) : ce test documente l'etat
// AVANT correction. Il mocke un backend qui n'applique aucune RLS (represente
// "et si le RLS etait desactive/mal configure ?", exactement la question que
// la mission pose) pour isoler ce que la couche applicative controle par
// elle-meme. Reponse aujourd'hui : rien. `authGetUser` est cable dans le mock
// mais jamais appele par le code de production - la preuve que talent-actions.ts
// n'etablit jamais l'identite de l'appelant avant de muter.

const authGetUser = vi.fn()

type Call = { table: string; op: string; args: unknown[] }
let calls: Call[] = []

function makeThenableChain(table: string) {
  const chain = {
    delete: (...args: unknown[]) => {
      calls.push({ table, op: 'delete', args })
      return chain
    },
    update: (...args: unknown[]) => {
      calls.push({ table, op: 'update', args })
      return chain
    },
    insert: (...args: unknown[]) => {
      calls.push({ table, op: 'insert', args })
      return chain
    },
    select: (...args: unknown[]) => {
      calls.push({ table, op: 'select', args })
      return chain
    },
    eq: (...args: unknown[]) => {
      calls.push({ table, op: 'eq', args })
      return chain
    },
    single: (...args: unknown[]) => {
      calls.push({ table, op: 'single', args })
      return chain
    },
    // Le query builder Supabase reel est thenable : `await` resout
    // directement la chaine sans `.then()` explicite cote appelant.
    then: (resolve: (v: { data: null; error: null }) => void) =>
      resolve({ data: null, error: null }),
  }
  return chain
}

const fromMock = vi.fn((table: string) => makeThenableChain(table))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: fromMock,
    auth: { getUser: authGetUser },
  })),
}))

const {
  deleteJobOfferAction,
  updateJobOfferAction,
  createJobOfferAction,
  updateApplicationStatusAction,
} = await import('./talent-actions')

beforeEach(() => {
  calls = []
  fromMock.mockClear()
  authGetUser.mockClear()
})

const VICTIM_ENTITY = 'entity-victime-11111111-1111-1111-1111-111111111111'
const VICTIM_OFFER = 'offer-victime-2222222-2222-2222-2222-222222222222'

describe('talent-actions.ts — entityId non verifie contre la session (avant correction)', () => {
  it("deleteJobOfferAction supprime une offre d'une entite non verifiee, sans jamais consulter l'identite de l'appelant", async () => {
    await deleteJobOfferAction(VICTIM_ENTITY, VICTIM_OFFER)

    // Aucun controle d'identite : auth.getUser() n'est jamais sollicite.
    expect(authGetUser).not.toHaveBeenCalled()
    // La mutation part quand meme vers la BDD, filtree sur l'entityId fourni
    // par l'appelant - jamais compare a un utilisateur authentifie.
    const deleteCall = calls.find((c) => c.table === 'entity_job_offers' && c.op === 'delete')
    const entityFilter = calls.find(
      (c) => c.table === 'entity_job_offers' && c.op === 'eq' && c.args[0] === 'entity_id',
    )
    expect(deleteCall).toBeDefined()
    expect(entityFilter?.args).toEqual(['entity_id', VICTIM_ENTITY])
  })

  it("updateJobOfferAction met a jour une offre d'une entite non verifiee, sans jamais consulter l'identite de l'appelant", async () => {
    await updateJobOfferAction(VICTIM_ENTITY, VICTIM_OFFER, { title: 'Modifie par un tiers' })

    expect(authGetUser).not.toHaveBeenCalled()
    const updateCall = calls.find((c) => c.table === 'entity_job_offers' && c.op === 'update')
    expect(updateCall).toBeDefined()
  })

  it('createJobOfferAction crée une offre rattachée à un entityId non vérifié, sans jamais consulter l’identité de l’appelant', async () => {
    await createJobOfferAction(VICTIM_ENTITY, {
      title: 'Offre créée par un tiers',
      contract_type: 'cdi',
      status: 'active',
      location_type: 'remote',
      blocks: [],
    })

    expect(authGetUser).not.toHaveBeenCalled()
    const insertCall = calls.find((c) => c.table === 'entity_job_offers' && c.op === 'insert')
    expect(insertCall).toBeDefined()
  })

  it("updateApplicationStatusAction change le statut d'une candidature sans même recevoir d'entityId à vérifier", async () => {
    await updateApplicationStatusAction('application-etrangere', 'hired', VICTIM_OFFER)

    expect(authGetUser).not.toHaveBeenCalled()
    const updateCall = calls.find((c) => c.table === 'entity_job_applications' && c.op === 'update')
    expect(updateCall).toBeDefined()
  })
})
