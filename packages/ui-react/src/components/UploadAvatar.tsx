'use client'

import { useState, useRef } from 'react'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { AvatarCropperModal } from './AvatarCropperModal'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const PATTERN_LINES = Array.from({ length: 6 }, (_, i) => i)

type UploadAvatarProps = {
  currentAvatarUrl: string | null
  displayName: string
  onUpload: (blob: Blob) => Promise<void>
  onDelete: () => Promise<void>
}

export function UploadAvatar({
  currentAvatarUrl,
  displayName,
  onUpload,
  onDelete,
}: UploadAvatarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nameText =
    `${displayName.toUpperCase()}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0`.repeat(10)

  function handleClick() {
    if (isLoading) return
    fileInputRef.current?.click()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WebP.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux, max 5 Mo.')
      return
    }

    setCropImageSrc(URL.createObjectURL(file))
  }

  async function handleCropConfirm(blob: Blob) {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
    setIsLoading(true)
    setError(null)

    try {
      await onUpload(blob)
    } catch {
      setError("Erreur lors de l'upload. Réessayez.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleCropCancel() {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      await onDelete()
    } catch {
      setError('Erreur lors de la suppression.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div
        className="group relative h-32 w-32 cursor-pointer overflow-hidden rounded-xl"
        onClick={handleClick}
      >
        {/* Avatar ou fallback pattern */}
        {currentAvatarUrl ? (
          <img src={currentAvatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-accent-soft">
            <svg
              className="h-full w-full"
              viewBox="0 0 600 600"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              {PATTERN_LINES.map((i) => (
                <text
                  key={i}
                  x={i % 2 === 0 ? 0 : -240}
                  y={i * 120 + 48}
                  fontSize={48}
                  fontWeight="600"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fill="var(--color-accent)"
                  fillOpacity={0.2}
                >
                  {nameText}
                </text>
              ))}
            </svg>
          </div>
        )}

        {/* Overlay au hover */}
        {!isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-neutral-900/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5 text-neutral-0" />
            <span className="text-xs font-medium text-neutral-0">Changer la photo</span>
            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleDelete}
                className="mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-0 transition hover:bg-neutral-0/20"
              >
                <Trash2 className="h-3 w-3" />
                Supprimer
              </button>
            )}
          </div>
        )}

        {/* Spinner pendant upload/suppression */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-0" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      {cropImageSrc && (
        <AvatarCropperModal
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
