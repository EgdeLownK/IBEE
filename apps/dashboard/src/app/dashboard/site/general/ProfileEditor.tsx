'use client'

import { useState, useEffect, useRef } from 'react'
import type { Database } from '@agora/supabase'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { IdentityCard } from './IdentityCard'
import { PresentationCard } from './PresentationCard'
import { ProfilePreview } from './ProfilePreview'
import { UnsavedChangesModal } from '@/components/dashboard/UnsavedChangesModal'
import { updateProfileField, updateAvatar, deleteAvatar } from './actions'
import { createClient } from '@/lib/supabase/client'

type Entity = Database['public']['Tables']['entity']['Row']

type FieldName = 'display_name' | 'role' | 'location' | 'bio'

type FormState = Record<FieldName, string>

type ProfileEditorProps = {
  initialEntity: Entity
}

function entityToFormState(entity: Entity): FormState {
  return {
    display_name: entity.display_name,
    role: entity.role ?? '',
    location: entity.location ?? '',
    bio: entity.bio ?? '',
  }
}

function validateField(field: FieldName, value: string): string | null {
  if (field === 'display_name') {
    if (value.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères'
    if (value.trim().length > 60) return 'Le nom ne peut pas dépasser 60 caractères'
  }
  if (field === 'role' && value.trim().length > 100) {
    return 'Le rôle ne peut pas dépasser 100 caractères'
  }
  if (field === 'location' && value.trim().length > 100) {
    return 'La localisation ne peut pas dépasser 100 caractères'
  }
  if (field === 'bio' && value.trim().length > 300) {
    return 'La bio ne peut pas dépasser 300 caractères'
  }
  return null
}

export function ProfileEditor({ initialEntity }: ProfileEditorProps) {
  const [formState, setFormState] = useState<FormState>(entityToFormState(initialEntity))
  const [savedState, setSavedState] = useState<FormState>(entityToFormState(initialEntity))
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialEntity.avatar_url)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const pendingNavigationRef = useRef<(() => void) | null>(null)

  const hasUnsavedChanges =
    formState.display_name !== savedState.display_name ||
    formState.role !== savedState.role ||
    formState.location !== savedState.location ||
    formState.bio !== savedState.bio

  // Alerte beforeunload (cas B)
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  function handleFieldChange(field: FieldName, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleFieldBlur(field: FieldName, value: string) {
    if (value === savedState[field]) return

    const error = validateField(field, value)
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [field]: error }))
      return
    }

    const result = await updateProfileField(field, value || null)

    if (result.success) {
      setSavedState((prev) => ({ ...prev, [field]: value }))
      toast.success('Modifications sauvegardées')
    } else {
      setFieldErrors((prev) => ({ ...prev, [field]: result.error }))
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  // --- Avatar upload/delete ---

  async function handleAvatarUpload(blob: Blob) {
    const supabase = createClient()
    const path = `${initialEntity.user_id}/avatar.webp`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/webp' })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    const result = await updateAvatar(publicUrl)
    if (!result.success) throw new Error(result.error)

    setAvatarUrl(publicUrl)
  }

  async function handleAvatarDelete() {
    const result = await deleteAvatar()
    if (!result.success) throw new Error(result.error)
    setAvatarUrl(null)
  }

  // --- Navigation interne ---

  function handleInternalNavigation(navigate: () => void) {
    if (hasUnsavedChanges) {
      pendingNavigationRef.current = navigate
      setShowUnsavedModal(true)
    } else {
      navigate()
    }
  }

  async function handleModalSave() {
    const dirtyField = (['display_name', 'role', 'location', 'bio'] as FieldName[]).find(
      (f) => formState[f] !== savedState[f]
    )
    if (dirtyField) {
      await handleFieldBlur(dirtyField, formState[dirtyField])
    }
    setShowUnsavedModal(false)
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current()
      pendingNavigationRef.current = null
    }
  }

  function handleModalDiscard() {
    setFormState(savedState)
    setFieldErrors({})
    setShowUnsavedModal(false)
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current()
      pendingNavigationRef.current = null
    }
  }

  function handleModalCancel() {
    pendingNavigationRef.current = null
    setShowUnsavedModal(false)
  }

  void handleInternalNavigation

  return (
    <>
      <div className="flex h-full w-full">
        {/* Zone 3 — Cards d'édition */}
        <div className="flex-[3] min-w-0 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[800px] p-4 md:p-8">
            {/* Lien retour au profil */}
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL}/${initialEntity.slug}`}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au profil
            </a>

            {/* Header avec salutation */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Bonjour{formState.display_name.trim() ? ` ${formState.display_name.trim().split(/\s+/)[0]}` : ''}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Présentez-vous à ceux qui ne vous connaissent pas encore.
              </p>
            </div>

            {/* Cards */}
            <div className="space-y-6">
              <IdentityCard
                displayName={formState.display_name}
                role={formState.role}
                location={formState.location}
                currentAvatarUrl={avatarUrl}
                onAvatarUpload={handleAvatarUpload}
                onAvatarDelete={handleAvatarDelete}
                onFieldBlur={handleFieldBlur}
                onFieldChange={handleFieldChange}
                fieldErrors={fieldErrors}
              />

              <PresentationCard
                bio={formState.bio}
                onFieldBlur={handleFieldBlur}
                onFieldChange={handleFieldChange}
                fieldErrors={fieldErrors}
              />
            </div>
          </div>
        </div>

        {/* Zone 4 — Preview (desktop only) */}
        <div className="hidden lg:block flex-[2] max-w-[800px] min-w-0 overflow-y-auto bg-background">
          <ProfilePreview
            entity={{ ...initialEntity, avatar_url: avatarUrl }}
            displayName={formState.display_name}
            role={formState.role || null}
            location={formState.location || null}
            bio={formState.bio || null}
          />
        </div>
      </div>

      {/* Modal alerte modifications non sauvegardées */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
        onCancel={handleModalCancel}
      />
    </>
  )
}
