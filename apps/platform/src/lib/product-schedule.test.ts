import { describe, expect, it } from 'vitest'
import { isProductScheduled, msUntilScheduled } from './product-schedule'

// Reproduit le bug fixé le 24/07 : ProductDetail.tsx calculait isScheduled/canBuy
// via `new Date(product.published_at).getTime() > Date.now()` directement dans le
// corps de rendu — un appel impur (react-hooks/purity) qui pouvait produire un
// résultat incohérent selon le moment exact du render. La logique est désormais
// extraite en fonctions pures paramétrées par `now`, testables sans dépendre de
// l'horloge réelle ni du cycle de rendu React.

describe('isProductScheduled', () => {
  it('retourne false si aucune date de publication', () => {
    expect(isProductScheduled(null, Date.now())).toBe(false)
  })

  it('retourne true si published_at est dans le futur', () => {
    const now = Date.parse('2026-07-24T10:00:00Z')
    const publishedAt = '2026-07-24T12:00:00Z'
    expect(isProductScheduled(publishedAt, now)).toBe(true)
  })

  it('retourne false si published_at est dans le passé', () => {
    const now = Date.parse('2026-07-24T12:00:00Z')
    const publishedAt = '2026-07-24T10:00:00Z'
    expect(isProductScheduled(publishedAt, now)).toBe(false)
  })

  it('retourne false exactement au moment de la publication (pas de fenêtre incohérente)', () => {
    const publishedAt = '2026-07-24T12:00:00Z'
    const now = Date.parse(publishedAt)
    expect(isProductScheduled(publishedAt, now)).toBe(false)
  })
})

describe('msUntilScheduled', () => {
  it('retourne null si aucune date de publication', () => {
    expect(msUntilScheduled(null, Date.now())).toBeNull()
  })

  it('retourne null si la date est déjà passée', () => {
    const now = Date.parse('2026-07-24T12:00:00Z')
    const publishedAt = '2026-07-24T10:00:00Z'
    expect(msUntilScheduled(publishedAt, now)).toBeNull()
  })

  it('retourne le délai exact restant si la date est dans le futur', () => {
    const now = Date.parse('2026-07-24T10:00:00Z')
    const publishedAt = '2026-07-24T12:00:00Z'
    expect(msUntilScheduled(publishedAt, now)).toBe(2 * 60 * 60 * 1000)
  })
})
