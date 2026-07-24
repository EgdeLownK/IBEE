export type EventRegistrationFieldType = 'text' | 'textarea' | 'select' | 'checkbox'

export type EventRegistrationField = {
  id: string
  label: string
  type: EventRegistrationFieldType
  required: boolean
  placeholder?: string
  options?: string[]
}

export function parseEventRegistrationFields(raw: unknown): EventRegistrationField[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: String(item.id ?? crypto.randomUUID()),
      label: String(item.label ?? '').trim(),
      type: (['text', 'textarea', 'select', 'checkbox'].includes(String(item.type))
        ? String(item.type)
        : 'text') as EventRegistrationFieldType,
      required: Boolean(item.required),
      placeholder: typeof item.placeholder === 'string' ? item.placeholder : undefined,
      options: Array.isArray(item.options)
        ? item.options.map((o) => String(o)).filter(Boolean)
        : undefined,
    }))
    .filter((f) => f.label.length > 0)
}

export function validateFormAnswers(
  fields: EventRegistrationField[],
  answers: Record<string, string | boolean>,
): { ok: true; answers: Record<string, string | boolean> } | { ok: false; error: string } {
  const normalized: Record<string, string | boolean> = {}

  for (const field of fields) {
    const value = answers[field.id]

    if (field.type === 'checkbox') {
      normalized[field.id] = Boolean(value)
      if (field.required && !normalized[field.id]) {
        return { ok: false, error: `Le champ « ${field.label} » est obligatoire.` }
      }
      continue
    }

    const text = typeof value === 'string' ? value.trim() : ''
    if (field.required && !text) {
      return { ok: false, error: `Le champ « ${field.label} » est obligatoire.` }
    }
    if (text.length > 500) {
      return { ok: false, error: `Le champ « ${field.label} » est trop long (500 car. max).` }
    }
    if (field.type === 'select' && text && field.options?.length && !field.options.includes(text)) {
      return { ok: false, error: `Valeur invalide pour « ${field.label} ».` }
    }
    if (text) normalized[field.id] = text
  }

  return { ok: true, answers: normalized }
}

export function formatCancellationPolicyLabel(cancelMinHours: number): string {
  if (cancelMinHours <= 0) return "Annulation possible jusqu'au début de l'événement."
  if (cancelMinHours < 24) {
    return `Annulation gratuite jusqu'à ${cancelMinHours} h avant le début.`
  }
  const days = Math.round(cancelMinHours / 24)
  return `Annulation gratuite jusqu'à ${days} jour${days > 1 ? 's' : ''} avant le début.`
}

export function canCancelRegistrationByPolicy(startAtIso: string, cancelMinHours: number): boolean {
  const startMs = new Date(startAtIso).getTime()
  const deadlineMs = startMs - cancelMinHours * 60 * 60 * 1000
  return Date.now() < deadlineMs
}
