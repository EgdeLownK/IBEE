export type FaqItemInput = { question: string; answer: string }

export const FAQ_MAX_ITEMS = 10
export const FAQ_QUESTION_MAX = 200
export const FAQ_ANSWER_MAX = 1000

export function parseFaqItems(raw: unknown): FaqItemInput[] {
  if (!Array.isArray(raw)) return []
  const out: FaqItemInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    const question = typeof row.question === 'string' ? row.question.trim() : ''
    const answer = typeof row.answer === 'string' ? row.answer.trim() : ''
    if (!question && !answer) continue
    out.push({ question, answer })
    if (out.length >= FAQ_MAX_ITEMS) break
  }
  return out
}

export function validateFaqItems(raw: unknown): FaqItemInput[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > FAQ_MAX_ITEMS) return null
  const cleaned: FaqItemInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    const question = typeof row.question === 'string' ? row.question.trim() : ''
    const answer = typeof row.answer === 'string' ? row.answer.trim() : ''
    if (question.length < 1 || question.length > FAQ_QUESTION_MAX) return null
    if (answer.length < 1 || answer.length > FAQ_ANSWER_MAX) return null
    cleaned.push({ question, answer })
  }
  return cleaned
}
