'use client'

import { Textarea } from '@ibee/ui-react'

type PresentationCardProps = {
  bio: string
  onFieldBlur: (field: 'bio', value: string) => void
  onFieldChange: (field: 'bio', value: string) => void
  fieldErrors: Record<string, string>
}

export function PresentationCard({
  bio,
  onFieldBlur,
  onFieldChange,
  fieldErrors,
}: PresentationCardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-0 shadow-md">
      {/* Header */}
      <div className="border-b border-neutral-200 px-8 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          Présentation
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Présentez-vous en quelques phrases. Ce texte apparaît sous votre nom.
        </p>
      </div>

      {/* Corps */}
      <div className="px-8 py-6">
        <div>
          <label htmlFor="bio" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Bio
          </label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => onFieldChange('bio', e.target.value)}
            onBlur={(e) => onFieldBlur('bio', e.target.value)}
            rows={6}
            placeholder="Présentez-vous en quelques phrases..."
            error={!!fieldErrors.bio}
            className="mt-1.5"
          />
          <div className="mt-1.5 flex items-center justify-between">
            {fieldErrors.bio ? (
              <p className="text-sm text-error">{fieldErrors.bio}</p>
            ) : (
              <span className="text-xs text-neutral-400">
                {bio.length} / 300 caractères
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
