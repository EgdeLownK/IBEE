import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { getHomeFeedPage } from './home-feed'

// PREUVE demandée par Killian (mission accueil #3, filtrage) : une offre
// inactive n'apparaît jamais dans le flux public. Deux étages distincts, à ne
// pas confondre :
//   1. RLS Postgres (entity_job_offers_public_select, entity_job_offer_media_
//      public_select, entity_job_offer_skills_public_select — toutes
//      `USING (status = 'active')` ou EXISTS équivalent, TO anon,
//      authenticated) — citées et vérifiées dans les migrations réelles
//      (rapport phase 0), PAS testables ici : `.claude/rules/testing.md`
//      interdit tout test d'intégration contre le remote lié (= prod).
//   2. Construction de la requête applicative — ce que CE fichier prouve :
//      fetchJobOfferPosts (home-feed.ts) appelle bien
//      `.eq('status', 'active')` sur entity_job_offers. Le mock ci-dessous
//      n'exécute AUCUN filtrage réel (il retourne les lignes du fixture telles
//      quelles, quels que soient les arguments reçus) — il enregistre les
//      appels. Cette preuve établit donc que le code applicatif REQUIERT le
//      filtre, pas que la base l'applique réellement : c'est la RLS (étage 1,
//      hors périmètre de ce test) qui garantit l'application effective.

type Call = { table: string; op: string; args: unknown[] }
let dbCalls: Call[] = []

const offerRow = {
  id: 'offer-1',
  title: 'Apprenti menuisier',
  contract_type: 'apprentissage',
  created_at: '2026-08-01T10:00:00Z',
  location_text: 'Bouillargues',
  entity_job_offer_media: [
    { url: 'https://img.test/offer.jpg', media_type: 'image', display_order: 0 },
  ],
  entity_job_offer_skills: [
    {
      offer_id: 'offer-1',
      skill_id: 'skill-1',
      display_order: 0,
      created_at: '2026-08-01T10:00:00Z',
      job_skills: { id: 'skill-1', label: 'Rentrée 2026' },
    },
  ],
  entity: {
    id: 'entity-1',
    slug: 'atelier-grezan',
    display_name: 'Atelier Grézan',
    avatar_url: null,
    location: 'Nîmes',
  },
}

function fixtureFor(table: string) {
  if (table === 'entity_job_offers') return { data: [offerRow], error: null }
  return { data: [], error: null }
}

function makeChain(table: string) {
  const chain = {
    select: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'select', args })
      return chain
    },
    eq: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'eq', args })
      return chain
    },
    not: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'not', args })
      return chain
    },
    lte: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'lte', args })
      return chain
    },
    order: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'order', args })
      return chain
    },
    limit: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'limit', args })
      return chain
    },
    // Le query builder Supabase réel est thenable : `await` résout la chaîne
    // sans `.then()` explicite côté appelant (même motif que
    // talent-actions.test.ts).
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve(fixtureFor(table)),
  }
  return chain
}

const mockClient = {
  from: (table: string) => makeChain(table),
} as unknown as SupabaseClient<Database>

describe('getHomeFeedPage — offres uniquement (mission accueil #3)', () => {
  it('requête entity_job_offers avec status=active (preuve de construction, pas de RLS)', async () => {
    dbCalls = []
    await getHomeFeedPage(mockClient)

    const offerCalls = dbCalls.filter((c) => c.table === 'entity_job_offers')
    expect(offerCalls).toContainEqual({
      table: 'entity_job_offers',
      op: 'eq',
      args: ['status', 'active'],
    })
    // Aucun autre .eq() sur cette table : la seule condition de filtrage est
    // bien le statut, pas un filtre plus étroit qui masquerait le résultat
    // pour une autre raison et ferait passer ce test à tort.
    expect(offerCalls.filter((c) => c.op === 'eq')).toHaveLength(1)
  })

  it('transforme la ligne active en HomeFeedPost kind=offer avec les bons champs dérivés', async () => {
    dbCalls = []
    const page = await getHomeFeedPage(mockClient)
    const postRow = page.rows.find((r) => r.type === 'post')
    if (!postRow || postRow.type !== 'post') throw new Error('aucune row post trouvée')

    expect(postRow.post.kind).toBe('offer')
    expect(postRow.post.href).toBe('/atelier-grezan/offres/offer-1')
    expect(postRow.post.ctaLabel).toBe('Rejoindre')
    // contractPill('apprentissage').label === 'Alternance' (contract-labels.ts)
    expect(postRow.post.badgeLabel).toBe('Alternance')
    // location_text de l'offre prioritaire sur entity.location (décision
    // Killian, rapport phase 0 Q4)
    expect(postRow.post.entity.location).toBe('Bouillargues')
    expect(postRow.post.skills).toEqual([{ id: 'skill-1', label: 'Rentrée 2026' }])
  })

  it("garde l'offre visible même sans image (placeholder, pas de filtre imageUrl)", async () => {
    dbCalls = []
    const rowWithoutImage = { ...offerRow, id: 'offer-2', entity_job_offer_media: [] }
    // Substitution locale du fixture pour ce seul cas — pas de mock global
    // partagé entre tests (chaque `it` réinitialise dbCalls et ne dépend pas
    // de l'ordre d'exécution).
    const client = {
      from: (table: string) => {
        if (table === 'entity_job_offers') {
          return makeChainFor(table, [rowWithoutImage])
        }
        return makeChain(table)
      },
    } as unknown as SupabaseClient<Database>

    const page = await getHomeFeedPage(client)
    const postRow = page.rows.find((r) => r.type === 'post')
    if (!postRow || postRow.type !== 'post') throw new Error('aucune row post trouvée')
    expect(postRow.post.imageUrl).toBe('')
  })
})

function makeChainFor(table: string, data: unknown[]) {
  const chain = {
    select: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'select', args })
      return chain
    },
    eq: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'eq', args })
      return chain
    },
    order: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'order', args })
      return chain
    },
    limit: (...args: unknown[]) => {
      dbCalls.push({ table, op: 'limit', args })
      return chain
    },
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  }
  return chain
}
