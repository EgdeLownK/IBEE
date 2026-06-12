'use client'

import { StepPresentation as SharedPresentation } from '../../entity-create/StepPresentation'
import type { ServiceCreateFormState } from '../types'

type Props = {
  form: ServiceCreateFormState
  onChange: (patch: Partial<ServiceCreateFormState>) => void
  updateForm: (fn: (prev: ServiceCreateFormState) => ServiceCreateFormState) => void
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
      publishChecked={form.isActive}
      publishLabel="Activer immédiatement"
      publishHint="(sinon brouillon, invisible des visiteurs)"
      faqHint="questions fréquentes de tes clients"
      onChange={(patch) => onChange(patch)}
      updateGallery={(fn) =>
        updateForm((prev) => ({ ...prev, galleryImages: fn(prev.galleryImages) }))
      }
      updateBlocks={(fn) =>
        updateForm((prev) => ({ ...prev, contentBlocks: fn(prev.contentBlocks) }))
      }
      onPublishChange={(isActive) => onChange({ isActive })}
    />
  )
}
