'use client'

import { Input, UploadAvatar } from '@agora/ui-react'

type IdentityCardProps = {
  displayName: string
  role: string
  location: string
  currentAvatarUrl: string | null
  onAvatarUpload: (blob: Blob) => Promise<void>
  onAvatarDelete: () => Promise<void>
  onFieldBlur: (field: 'display_name' | 'role' | 'location', value: string) => void
  onFieldChange: (field: 'display_name' | 'role' | 'location', value: string) => void
  fieldErrors: Record<string, string>
}

export function IdentityCard({
  displayName,
  role,
  location,
  currentAvatarUrl,
  onAvatarUpload,
  onAvatarDelete,
  onFieldBlur,
  onFieldChange,
  fieldErrors,
}: IdentityCardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-0 shadow-md">
      {/* Header */}
      <div className="border-b border-neutral-200 px-8 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          Identité
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Vos informations principales, visibles sur votre profil public.
        </p>
      </div>

      {/* Corps */}
      <div className="space-y-5 px-8 py-6">
        {/* Avatar */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Photo de profil
          </label>
          <div className="mt-2">
            <UploadAvatar
              currentAvatarUrl={currentAvatarUrl}
              displayName={displayName}
              onUpload={onAvatarUpload}
              onDelete={onAvatarDelete}
            />
          </div>
        </div>

        {/* Display name */}
        <FieldText
          id="display_name"
          label="Nom affiché"
          required
          value={displayName}
          error={fieldErrors.display_name}
          placeholder="Votre nom complet"
          onChange={(v) => onFieldChange('display_name', v)}
          onBlur={(v) => onFieldBlur('display_name', v)}
        />

        {/* Role */}
        <FieldText
          id="role"
          label="Rôle / Titre"
          value={role}
          error={fieldErrors.role}
          placeholder="Ex : Coach en développement personnel"
          onChange={(v) => onFieldChange('role', v)}
          onBlur={(v) => onFieldBlur('role', v)}
        />

        {/* Location */}
        <FieldText
          id="location"
          label="Localisation"
          value={location}
          error={fieldErrors.location}
          placeholder="Ex : Paris, France"
          onChange={(v) => onFieldChange('location', v)}
          onBlur={(v) => onFieldBlur('location', v)}
        />
      </div>
    </div>
  )
}

type FieldTextProps = {
  id: string
  label: string
  value: string
  error?: string
  required?: boolean
  placeholder?: string
  onChange: (value: string) => void
  onBlur: (value: string) => void
}

function FieldText({
  id,
  label,
  value,
  error,
  required,
  placeholder,
  onChange,
  onBlur,
}: FieldTextProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
        {required && <span className="ml-1 font-normal text-neutral-400">*</span>}
      </label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder={placeholder}
        error={!!error}
        className="mt-1.5"
      />
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  )
}
