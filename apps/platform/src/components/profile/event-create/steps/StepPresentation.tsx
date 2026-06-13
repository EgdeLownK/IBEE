'use client'

import { StepPresentation as SharedPresentation } from '../../entity-create/StepPresentation'
import type { EventCreateFormState } from '../types'

type Props = {
  form: EventCreateFormState
  onChange: (patch: Partial<EventCreateFormState>) => void
  updateForm: (fn: (prev: EventCreateFormState) => EventCreateFormState) => void
}

export function StepPresentation({ form, onChange, updateForm }: Props) {
  return (
    <SharedPresentation
      fields={{
        highlights: form.highlights,
        galleryImages: form.galleryImages,
        contentBlocks: form.contentBlocks,
        faq: form.faq,
        fieldErrors: form.fieldErrors,
      }}
      publishChecked={form.isPublished}
      publishLabel="Publier immédiatement"
      publishHint="(sinon brouillon, invisible des visiteurs)"
      faqHint="questions fréquentes des participants"
      onChange={(patch) => onChange(patch)}
      updateGallery={(fn) =>
        updateForm((prev) => ({ ...prev, galleryImages: fn(prev.galleryImages) }))
      }
      updateBlocks={(fn) =>
        updateForm((prev) => ({ ...prev, contentBlocks: fn(prev.contentBlocks) }))
      }
      onPublishChange={(isPublished) => onChange({ isPublished })}
    />
  )
}
