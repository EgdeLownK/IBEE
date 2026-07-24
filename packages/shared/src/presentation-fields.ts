/** Champs présentation partagés service / event (étape finale). */

export type ContentBlockInput =
  { type: 'text'; content: string } | { type: 'image'; url: string; alt?: string }

export type FaqInput = { question: string; answer: string }

export type PresentationDraft = {
  highlights: string[]
  gallery: { url: string; uploading: boolean }[]
  contentBlocks: (
    { type: 'text'; content: string } | { type: 'image'; url: string; uploading: boolean }
  )[]
  faq: { question: string; answer: string }[]
}

export function validatePresentationFields(
  draft: PresentationDraft,
  fail: (field: string, msg: string) => void,
): void {
  if (draft.gallery.some((g) => g.uploading)) {
    fail('gallery_images', "Patiente, une image est en cours d'envoi.")
  }
  if (draft.highlights.length > 4) {
    fail('highlights', 'Maximum 4 points forts.')
  }
  for (const raw of draft.highlights) {
    const h = raw.trim()
    if (h.length < 1 || h.length > 80) {
      fail('highlights', 'Chaque point fort doit faire entre 1 et 80 caractères.')
      break
    }
  }

  if (draft.gallery.length > 6) {
    fail('gallery_images', 'Maximum 6 images.')
  }
  for (const g of draft.gallery) {
    if (!g.url) continue
    try {
      new URL(g.url)
    } catch {
      fail('gallery_images', 'Chaque image doit avoir une URL valide.')
      break
    }
  }

  if (draft.contentBlocks.some((b) => b.type === 'image' && b.uploading)) {
    fail('content_blocks', "Patiente, une image est en cours d'envoi.")
  }
  if (draft.contentBlocks.length > 20) {
    fail('content_blocks', 'Maximum 20 blocs.')
  }
  for (const b of draft.contentBlocks) {
    if (b.type === 'text') {
      const c = b.content.trim()
      if (c.length < 1 || c.length > 2000) {
        fail('content_blocks', 'Chaque bloc texte doit faire entre 1 et 2000 caractères.')
        break
      }
    } else if (!b.url) {
      fail('content_blocks', 'Chaque bloc image doit contenir une image envoyée.')
      break
    }
  }

  if (draft.faq.length > 10) {
    fail('faq', 'Maximum 10 questions.')
  }
  for (const item of draft.faq) {
    const q = item.question.trim()
    const a = item.answer.trim()
    if (q === '' && a === '') continue
    if (q.length < 1 || q.length > 200 || a.length < 1 || a.length > 1000) {
      fail('faq', 'Chaque entrée : question 1-200 caractères, réponse 1-1000 caractères.')
      break
    }
  }
}

export function buildPresentationPayload(draft: PresentationDraft): {
  highlights?: string[]
  gallery_images?: string[]
  content_blocks?: ContentBlockInput[]
  faq?: FaqInput[]
} {
  const highlights = draft.highlights.map((h) => h.trim()).filter((h) => h.length > 0)
  const gallery_images = draft.gallery.map((g) => g.url).filter((u) => u.length > 0)

  const content_blocks: ContentBlockInput[] = []
  for (const b of draft.contentBlocks) {
    if (b.type === 'text') {
      const c = b.content.trim()
      if (c.length > 0) content_blocks.push({ type: 'text', content: c })
    } else if (b.url) {
      content_blocks.push({ type: 'image', url: b.url })
    }
  }

  const faq: FaqInput[] = []
  for (const item of draft.faq) {
    const q = item.question.trim()
    const a = item.answer.trim()
    if (q.length > 0 && a.length > 0) faq.push({ question: q, answer: a })
  }

  const out: {
    highlights?: string[]
    gallery_images?: string[]
    content_blocks?: ContentBlockInput[]
    faq?: FaqInput[]
  } = {}
  if (highlights.length > 0) out.highlights = highlights
  if (gallery_images.length > 0) out.gallery_images = gallery_images
  if (content_blocks.length > 0) out.content_blocks = content_blocks
  if (faq.length > 0) out.faq = faq
  return out
}
