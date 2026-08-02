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
let mockOffer: { id?: string; entity_id: string; status?: string } | null = null
let mockRelaunchError: { message: string; code?: string } | null = null

const authGetUser = vi.fn(async () => ({ data: { user: mockUser } }))

const rpcCalls: Array<{ fn: string; args: unknown }> = []
const rpcMock = vi.fn(async (fn: string, args: unknown) => {
  rpcCalls.push({ fn, args })
  if (fn === 'entity_user_has_permission') {
    return { data: mockPermission, error: null }
  }
  if (fn === 'relaunch_job_offer') {
    return { data: null, error: mockRelaunchError }
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
  mockRelaunchError = null
  fromMock.mockClear()
  authGetUser.mockClear()
  rpcMock.mockClear()
})

const OWNED_ENTITY = 'entity-proprietaire-1111-1111-1111-111111111111'
const FOREIGN_ENTITY = 'entity-etrangere-2222-2222-2222-222222222222'
const OFFER_ID = 'offer-3333-3333-3333-333333333333'

describe('talent-actions.ts — permission verifiee via entity_user_has_permission (apres correction)', () => {
  describe('createJobOfferAction / updateJobOfferAction / deleteJobOfferAction', () => {
    // Remuneration + localisation obligatoires a la creation depuis
    // requireCompensation/requireLocationText (talent-actions.ts) : fixture
    // complete pour que ces tests de permission ne soient pas bloques par la
    // validation metier qu'ils ne visent pas a tester. location_type: 'remote'
    // dispense de location_text (jamais requis pour ce type).
    const newOfferInput = {
      title: 'Offre',
      contract_type: 'cdi' as const,
      status: 'active' as const,
      location_type: 'remote' as const,
      blocks: [],
      compensation_type: 'fixed' as const,
      compensation_amount: 3000,
      compensation_frequency: 'monthly' as const,
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

    // PREUVE mission feat/job-offer-media-form, sens (a) : une offre creee
    // avec des medias les enregistre dans le bon ordre. createJobOfferAction
    // cree l'offre PUIS insere les medias via addJobOfferMedia (offer_id =
    // l'id retourne par l'insert precedent) - display_order derive de la
    // position dans le tableau recu, pas d'un champ fourni par le client.
    it('c) créée avec des médias → enregistrés via addJobOfferMedia, display_order croissant selon l’ordre reçu', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true
      mockOffer = { id: 'new-offer-id', entity_id: OWNED_ENTITY, status: 'active' }

      await expect(
        createJobOfferAction(OWNED_ENTITY, {
          ...newOfferInput,
          media: [
            { url: 'https://x.test/1.jpg', type: 'image' },
            { url: 'https://x.test/2.jpg', type: 'image' },
            { url: 'https://x.test/3.mp4', type: 'video' },
          ],
        }),
      ).resolves.toBeUndefined()

      const mediaInsert = dbCalls.find(
        (c) => c.table === 'entity_job_offer_media' && c.op === 'insert',
      )
      expect(mediaInsert).toBeDefined()
      const rows = mediaInsert!.args[0] as Array<{
        offer_id: string
        url: string
        display_order: number
      }>
      expect(rows.every((r) => r.offer_id === 'new-offer-id')).toBe(true)
      expect(rows.map((r) => r.display_order)).toEqual([0, 1, 2])
      expect(rows.map((r) => r.url)).toEqual([
        'https://x.test/1.jpg',
        'https://x.test/2.jpg',
        'https://x.test/3.mp4',
      ])
    })

    // PREUVE mission feat/job-offer-media-form, sens (b) : un depassement de
    // la limite de nombre est refuse COTE SERVEUR - appel direct de l'action
    // avec une charge deja hors limite (comme le ferait un appel qui
    // contourne JobOfferDialog.tsx), sans jamais passer par le formulaire.
    it('d) plus de 10 médias → refusé côté serveur avant tout appel BDD (contournement direct du client)', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true

      const tooManyMedia = Array.from({ length: 11 }, (_, i) => ({
        url: `https://x.test/${i}.jpg`,
        type: 'image' as const,
      }))

      await expect(
        createJobOfferAction(OWNED_ENTITY, { ...newOfferInput, media: tooManyMedia }),
      ).rejects.toThrow('Maximum 10 médias.')

      expect(dbCalls.some((c) => c.table === 'entity_job_offers' && c.op === 'insert')).toBe(false)
      expect(dbCalls.some((c) => c.table === 'entity_job_offer_media')).toBe(false)
    })

    it('d) plus d’une vidéo → refusé côté serveur avant tout appel BDD', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true

      await expect(
        createJobOfferAction(OWNED_ENTITY, {
          ...newOfferInput,
          media: [
            { url: 'https://x.test/1.mp4', type: 'video' },
            { url: 'https://x.test/2.mp4', type: 'video' },
          ],
        }),
      ).rejects.toThrow('Une seule vidéo est autorisée.')

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

    // PREUVE mission feat/talent-relaunch-rpc-wiring : remplacement des deux
    // .from().update() separes (archivage + increment) par un appel unique
    // a la RPC relaunch_job_offer, lors d'une remise en ligne (inactive ->
    // active).
    it('a) updateJobOfferAction — remise en ligne légitime → appelle relaunch_job_offer, plus d’update direct sur entity_job_applications', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true
      mockOffer = { entity_id: OWNED_ENTITY, status: 'inactive' }

      await expect(
        updateJobOfferAction(OWNED_ENTITY, OFFER_ID, { status: 'active' }),
      ).resolves.toBeUndefined()

      expect(rpcCalls).toContainEqual({
        fn: 'relaunch_job_offer',
        args: { p_offer_id: OFFER_ID },
      })
      expect(dbCalls.some((c) => c.table === 'entity_job_applications' && c.op === 'update')).toBe(
        false,
      )
    })

    it('b) updateJobOfferAction — remise en ligne sans permission (entité étrangère) → refusé côté application, relaunch_job_offer jamais appelée', async () => {
      mockUser = { id: 'user-attaquant' }
      mockPermission = false
      mockOffer = { entity_id: FOREIGN_ENTITY, status: 'inactive' }

      await expect(
        updateJobOfferAction(FOREIGN_ENTITY, OFFER_ID, { status: 'active' }),
      ).rejects.toThrow("Vous n'avez pas les droits sur cette offre d'emploi.")

      expect(rpcCalls.some((c) => c.fn === 'relaunch_job_offer')).toBe(false)
    })

    it('b) updateJobOfferAction — relaunch_job_offer refuse côté base (Forbidden) → l’erreur remonte, jamais d’échec silencieux', async () => {
      mockUser = { id: 'user-legitime' }
      mockPermission = true
      mockOffer = { entity_id: OWNED_ENTITY, status: 'inactive' }
      mockRelaunchError = { message: 'Forbidden', code: 'P0001' }

      await expect(
        updateJobOfferAction(OWNED_ENTITY, OFFER_ID, { status: 'active' }),
      ).rejects.toEqual({ message: 'Forbidden', code: 'P0001' })

      expect(rpcCalls).toContainEqual({
        fn: 'relaunch_job_offer',
        args: { p_offer_id: OFFER_ID },
      })
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
