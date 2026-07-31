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

describe('contractLabel', () => {
  it('reprend le libellé secondaire de la pastille pour une valeur connue', () => {
    expect(contractLabel('cdi')).toBe('Temps plein')
    expect(contractLabel('mission')).toBe('Freelance')
  })

  it('ne plante pas sur une valeur inconnue et rend un texte, jamais une exception', () => {
    expect(() => contractLabel('freelance_futur')).not.toThrow()
    expect(typeof contractLabel('freelance_futur')).toBe('string')
  })
})
