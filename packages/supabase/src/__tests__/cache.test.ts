import { describe, expect, it } from 'vitest'
import { getRevalidatePaths } from '../cache'

describe('getRevalidatePaths', () => {
  it('retourne profil et home par défaut', () => {
    expect(getRevalidatePaths('mon-shop')).toEqual(['/', '/mon-shop'])
  })

  it('ajoute le permalien publication', () => {
    expect(getRevalidatePaths('mon-shop', { publicationSlug: 'hello' })).toEqual([
      '/',
      '/mon-shop',
      '/mon-shop/news/hello',
    ])
  })

  it('ajoute les pages détail shop/service/event', () => {
    expect(
      getRevalidatePaths('acme', {
        productSlug: 'tee-shirt',
        serviceSlug: 'coaching',
        eventSlug: 'atelier',
      })
    ).toEqual([
      '/',
      '/acme',
      '/acme/shop/tee-shirt',
      '/acme/services/coaching',
      '/acme/events/atelier',
    ])
  })
})
