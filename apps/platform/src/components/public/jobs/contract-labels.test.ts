import { describe, expect, it } from 'vitest'
import type { JobContractType } from '@ibee/supabase'
import { CONTRACT_PILL, contractLabel, contractPill } from './contract-labels'

const EXPECTED: Record<JobContractType, { code: string; label: string }> = {
  cdi: { code: 'CDI', label: 'Temps plein' },
  cdd: { code: 'CDD', label: 'Durée déterminée' },
  interim: { code: 'INT', label: 'Mission courte' },
  contrat_pro: { code: 'PRO', label: 'Alternance' },
  apprentissage: { code: 'APP', label: 'Alternance' },
  stage: { code: 'STA', label: 'Stage' },
  mission: { code: 'FREE', label: 'Freelance' },
}

describe('contractPill', () => {
  for (const [value, expected] of Object.entries(EXPECTED)) {
    it(`retourne la pastille arbitrée pour "${value}"`, () => {
      expect(contractPill(value)).toEqual(expected)
      expect(CONTRACT_PILL[value as JobContractType]).toEqual(expected)
    })
  }

  it("ne plante pas sur une valeur d'enum inconnue et rend un texte dégradé", () => {
    expect(() => contractPill('freelance_futur')).not.toThrow()
    const pill = contractPill('freelance_futur')
    expect(typeof pill.code).toBe('string')
    expect(typeof pill.label).toBe('string')
  })
})

const EXPECTED_NAMES: Record<JobContractType, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  interim: 'Intérim',
  contrat_pro: 'Contrat pro',
  apprentissage: 'Apprentissage',
  stage: 'Stage',
  mission: 'Freelance',
}

describe('contractLabel', () => {
  for (const [value, expected] of Object.entries(EXPECTED_NAMES)) {
    it(`affiche le nom du contrat "${expected}" pour "${value}" (page détail)`, () => {
      expect(contractLabel(value)).toBe(expected)
    })
  }

  it('ne plante pas sur une valeur inconnue et rend un texte, jamais une exception', () => {
    expect(() => contractLabel('freelance_futur')).not.toThrow()
    expect(typeof contractLabel('freelance_futur')).toBe('string')
  })
})
