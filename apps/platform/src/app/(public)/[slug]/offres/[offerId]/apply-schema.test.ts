import { describe, expect, it } from 'vitest'
import { ApplyFieldsSchema, OfferIdSchema } from './apply-schema'

const validFields = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
}

describe('OfferIdSchema', () => {
  it('accepte un uuid valide', () => {
    expect(OfferIdSchema.safeParse('f47ac10b-58cc-4372-a567-0e02b2c3d479').success).toBe(true)
  })

  it("rejette un identifiant qui n'est pas un uuid (appel direct hors formulaire)", () => {
    expect(OfferIdSchema.safeParse('not-an-uuid').success).toBe(false)
    expect(OfferIdSchema.safeParse('').success).toBe(false)
  })
})

describe('ApplyFieldsSchema', () => {
  it('accepte un formulaire valide', () => {
    const result = ApplyFieldsSchema.safeParse(validFields)
    expect(result.success).toBe(true)
  })

  it('trim les champs avant validation', () => {
    const result = ApplyFieldsSchema.safeParse({
      ...validFields,
      first_name: '  Ada  ',
      email: '  ada@example.com  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.first_name).toBe('Ada')
      expect(result.data.email).toBe('ada@example.com')
    }
  })

  it('rejette un email invalide', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, email: 'pas-un-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Cette adresse email n'est pas valide.")
    }
  })

  it('rejette un prénom vide', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, first_name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Merci de renseigner votre prénom.')
    }
  })

  it('rejette un prénom composé uniquement d’espaces (vide après trim)', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, first_name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejette un nom vide', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, last_name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Merci de renseigner votre nom.')
    }
  })

  it('rejette un email vide', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, email: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Merci de renseigner votre email.')
    }
  })

  it('rejette un prénom dépassant 100 caractères', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, first_name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Le prénom ne peut pas dépasser 100 caractères.')
    }
  })

  it('accepte un prénom exactement à 100 caractères (limite incluse)', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, first_name: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('rejette un nom dépassant 100 caractères', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, last_name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Le nom ne peut pas dépasser 100 caractères.')
    }
  })

  it('rejette un email dépassant 320 caractères', () => {
    const longLocalPart = 'a'.repeat(315)
    const result = ApplyFieldsSchema.safeParse({ ...validFields, email: `${longLocalPart}@ex.com` })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'Cette adresse email est trop longue.'),
      ).toBe(true)
    }
  })

  it('rejette un message dépassant 2000 caractères', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, message: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Le message ne peut pas dépasser 2000 caractères.',
      )
    }
  })

  it('accepte un message absent', () => {
    const result = ApplyFieldsSchema.safeParse(validFields)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBeUndefined()
    }
  })

  it('convertit un message vide (espaces uniquement) en undefined', () => {
    const result = ApplyFieldsSchema.safeParse({ ...validFields, message: '   ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBeUndefined()
    }
  })
})
