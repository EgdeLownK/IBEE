import { describe, expect, it } from 'vitest'
import { computeDelta } from '../analytics'

describe('computeDelta', () => {
  it('returns zero delta when both are zero', () => {
    expect(computeDelta(0, 0)).toEqual({ deltaLabel: '0 %', up: true, deltaPct: 0 })
  })

  it('returns +100% when previous is zero', () => {
    expect(computeDelta(5, 0)).toEqual({ deltaLabel: '+100 %', up: true, deltaPct: 100 })
  })

  it('computes negative delta', () => {
    const result = computeDelta(8, 10)
    expect(result.up).toBe(false)
    expect(result.deltaPct).toBe(-20)
    expect(result.deltaLabel).toBe('-20 %')
  })
})
