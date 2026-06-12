/** Validation champs profil entity — miroir informations.astro */

export type EntityProfileInput = {
  display_name: string
  role?: string | null
  bio?: string | null
  location?: string | null
}

export type ValidationResult = {
  ok: boolean
  fieldErrors: Record<string, string>
}

export function validateEntityProfile(input: EntityProfileInput): ValidationResult {
  const fieldErrors: Record<string, string> = {}
  const fail = (field: string, msg: string) => {
    fieldErrors[field] = msg
  }

  const name = input.display_name.trim()
  if (name.length < 1) fail('display_name', 'Le nom est obligatoire.')
  else if (name.length > 80) fail('display_name', 'Maximum 80 caractères.')

  if (input.role != null && input.role.trim().length > 80) {
    fail('role', 'Maximum 80 caractères.')
  }

  if (input.bio != null && input.bio.trim().length > 200) {
    fail('bio', 'Maximum 200 caractères.')
  }

  if (input.location != null && input.location.trim().length > 120) {
    fail('location', 'Maximum 120 caractères.')
  }

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors }
}

export function buildEntityProfileUpdate(input: EntityProfileInput) {
  const role = input.role?.trim() ?? ''
  const bio = input.bio?.trim() ?? ''
  const location = input.location?.trim() ?? ''
  return {
    display_name: input.display_name.trim(),
    role: role.length > 0 ? role : null,
    bio: bio.length > 0 ? bio : null,
    location: location.length > 0 ? location : null,
  }
}
