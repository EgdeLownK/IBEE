import { describe, expect, it } from 'vitest'
import { formatOrderRef, isSaleActive, resolveUnitPriceCents } from '../orders'

describe('orders pricing helpers', () => {
  it('detects active sale', () => {
    expect(
      isSaleActive({ sale_price_cents: 900, sale_ends_at: null })
    ).toBe(true)
    expect(
      isSaleActive({
        sale_price_cents: 900,
        sale_ends_at: new Date(Date.now() + 60_000).toISOString(),
      })
    ).toBe(true)
    expect(
      isSaleActive({
        sale_price_cents: 900,
        sale_ends_at: new Date(Date.now() - 60_000).toISOString(),
      })
    ).toBe(false)
  })

  it('resolves unit price with sale and variant override', () => {
    const product = { price_cents: 1000, sale_price_cents: 800, sale_ends_at: null }
    expect(resolveUnitPriceCents(product)).toBe(800)
    expect(resolveUnitPriceCents(product, { price_cents_override: 750 })).toBe(750)
    expect(
      resolveUnitPriceCents(
        { price_cents: 1000, sale_price_cents: null, sale_ends_at: null },
        null
      )
    ).toBe(1000)
  })

  it('formats order reference with hash prefix', () => {
    expect(formatOrderRef('CMD-000042')).toBe('#CMD-000042')
    expect(formatOrderRef('#CMD-000042')).toBe('#CMD-000042')
  })
})
