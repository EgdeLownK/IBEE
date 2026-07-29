import { describe, expect, it, vi, beforeEach } from 'vitest'

// PREUVE PHASE 1 -> PHASE 3 (mission fix/talent-actions-auth).
// Avant correction, ce fichier prouvait que les 4 actions ne consultaient
// jamais l'identite de l'appelant (auth.getUser() jamais appele, mutation
// tentee quel que soit l'entityId recu). Apres correction, les memes
// scenarios sont inverses : un appel legitime (proprietaire OU membre
// d'equipe avec la permission 'talent', via la RPC entity_user_has_permission)
// passe ; le meme appel avec une entite etrangere est refuse par le code
// AVANT toute mutation en base - meme si le mock ne simule aucune RLS
// (equivalent a "RLS desactivee"), ce qui isole precisement ce que le code
// applicatif garantit par lui-meme.

type Call = { table: string; op: string; args: unknown[] }
let dbCalls: Call[] = []

let mockUser: { id: string } | null = null
let mockPermission = false
let mockApplication: { offer_id: string } | null = null
let mockOffer: { entity_id: string; status?: string } | null = null

const authGetUser = vi.fn(async () => ({ data: { user: mockUser } }))

const rpcCalls: Array<{ fn: string; args: unknown }> = []
const rpcMock = vi.fn(async (fn: string, args: unknown) => {
  rpcCalls.push({ fn, args })
  if (fn === 'entity_user_has_permission') {
    return { data: mockPermission, error: null }
  }
  return { data: null, error: null }
})

function singleResult(table: string) {
  if (table === 'entity_job_applications') return { data: mockApplication, error: null }
  if (table === 'entity_job_offers') return { data: mockOffer, error: null }
  return { data: null, error: null }
}

function makeChain(table: string) {
  const chain = {
    delete: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'delete', args })
      return chain
    },
    update: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'update', args })
      return chain
    },
    insert: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'insert', args })
      return chain
    },
    select: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'select', args })
      return chain
    },
    eq: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'eq', args })
      return chain
    },
    single: async () => {
      dbCalls.push({ table, op: 'single', args: [] })
      return singleResult(table)
    },
    maybeSingle: async () => {
      dbCalls.push({ table, op: 'maybeSingle', args: [] })
      return singleResult(table)
    },
    // Le query builder Supabase reel est thenable : `await` resout la
    // chaine sans `.then()` explicite cote appelant (cas update/delete/insert
    // sans .single()/.maybeSingle() final).
    then: (resolve: (v: { data: null; error: null }) => void) =>
      resolve({ data: null, error: null }),
  }
  return chain
}

const fromMock = vi.fn((table: string) => makeChain(table))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: fromMock,
    auth: { getUser: authGetUser },
    rpc: rpcMock,
  })),
}))

const {
  deleteJobOfferAction,
  updateJobOfferAction,
  createJobOfferAction,
  updateApplicationStatusAction,
} = await import('./talent-actions')

beforeEach(() => {
  dbCalls = []
  rpcCalls.length = 0
  mockUser = null
  mockPermission = false
  mockApplication = null
  mockOffer = null
  fromMock.mockClear()
  authGetUser.mockClear()
  rpcMock.mockClear()
})

const OWNED_ENTITY = 'entity-proprietaire-1111-1111-1111-111111111111'
const FOREIGN_ENTITY = 'entity-etrangere-2222-2222-2222-222222222222'
const OFFER_ID = 'offer-3333-3333-3333-333333333333'

describe('talent-actions.ts — permission verifiee via entity_user_has_permission (apres correction)', () => {
  describe('createJobOfferAction / updateJobOfferAction / deleteJobOfferAction', () => {
    const newOfferInput = {
      title: 'Offre',
      contract_type: 'cdi' as const,
      status: 'active' as const,
      location_type: 'remote' as const,
      blocks: [],
    }

    it('a) appel légitime (permission accordée sur l’entité) → la mutation atteint la base', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true

      await expect(createJobOfferAction(OWNED_ENTITY, newOfferInput)).resolves.toBeUndefined()

      expect(authGetUser).toHaveBeenCalled()
      expect(rpcCalls[0]).toEqual({
        fn: 'entity_user_has_permission',
        args: { p_entity_id: OWNED_ENTITY, p_permission: 'talent' },
      })
      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'insert')).toBe(true)
    })

    it('b) même appel avec une entité étrangère → refusé par le code, avant tout appel BDD sur entity_job_offers', async () => {
      mockUser = { id: 'user-attaquant' }
      mockPermission = false

      await expect(createJobOfferAction(FOREIGN_ENTITY, newOfferInput)).rejects.toThrow(
        "Vous n'avez pas les droits sur cette offre d'emploi.",
      )

      expect(authGetUser).toHaveBeenCalled()
      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'insert')).toBe(false)
    })

    it('a) updateJobOfferAction — appel légitime → la mutation atteint la base', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true

      await expect(
        updateJobOfferAction(OWNED_ENTITY, OFFER_ID, { title: 'Modifié' }),
      ).resolves.toBeUndefined()

      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'update')).toBe(true)
    })

    it('b) updateJobOfferAction — entité étrangère → refusé avant tout appel BDD', async () => {
      mockUser = { id: 'user-attaquant' }
      mockPermission = false

      await expect(
        updateJobOfferAction(FOREIGN_ENTITY, OFFER_ID, { title: 'Modifié par un tiers' }),
      ).rejects.toThrow("Vous n'avez pas les droits sur cette offre d'emploi.")

      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'update')).toBe(false)
    })

    it('a) deleteJobOfferAction — appel légitime → la mutation atteint la base', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true

      await expect(deleteJobOfferAction(OWNED_ENTITY, OFFER_ID)).resolves.toBeUndefined()

      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'delete')).toBe(true)
    })

    it('b) deleteJobOfferAction — entité étrangère → refusé avant tout appel BDD', async () => {
      mockUser = { id: 'user-attaquant' }
      mockPermission = false

      await expect(deleteJobOfferAction(FOREIGN_ENTITY, OFFER_ID)).rejects.toThrow(
        "Vous n'avez pas les droits sur cette offre d'emploi.",
      )

      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'delete')).toBe(false)
    })

    it('appel non authentifié → refusé avant toute vérification de permission', async () => {
      mockUser = null

      await expect(deleteJobOfferAction(OWNED_ENTITY, OFFER_ID)).rejects.toThrow(
        'Vous devez être connecté pour effectuer cette action.',
      )
      expect(rpcMock).not.toHaveBeenCalled()
    })
  })

  describe('updateApplicationStatusAction — résolution candidature → offre → entité', () => {
    it("c) appel légitime : l'entité résolue depuis l'application appartient à l'appelant → la mutation atteint la base", async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true
      mockApplication = { offer_id: OFFER_ID }
      mockOffer = { entity_id: OWNED_ENTITY }

      await expect(
        updateApplicationStatusAction('application-1', 'hired', OFFER_ID),
      ).resolves.toBeUndefined()

      expect(rpcCalls[0]).toEqual({
        fn: 'entity_user_has_permission',
        args: { p_entity_id: OWNED_ENTITY, p_permission: 'talent' },
      })
      expect(dbCalls.some((c) => c.table === 'entity_job_applications' && c.op === 'update')).toBe(
        true,
      )
    })

    it('c) applicationId appartenant à une entité étrangère → refusé par le code, avant la mutation de statut', async () => {
      mockUser = { id: 'user-attaquant' }
      mockPermission = false
      mockApplication = { offer_id: OFFER_ID }
      mockOffer = { entity_id: FOREIGN_ENTITY }

      await expect(
        updateApplicationStatusAction('application-etrangere', 'hired', OFFER_ID),
      ).rejects.toThrow("Vous n'avez pas les droits sur cette offre d'emploi.")

      expect(dbCalls.some((c) => c.table === 'entity_job_applications' && c.op === 'update')).toBe(
        false,
      )
    })

    it('applicationId inexistant (résolution échoue) → refusé, message générique', async () => {
      mockUser = { id: 'user-attaquant' }
      mockApplication = null

      await expect(
        updateApplicationStatusAction('application-inconnue', 'hired', OFFER_ID),
      ).rejects.toThrow('Candidature introuvable.')

      expect(rpcMock).not.toHaveBeenCalled()
    })
  })
})
