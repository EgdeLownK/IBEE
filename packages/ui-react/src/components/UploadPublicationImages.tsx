'use client'

import { useState, useRef } from 'react'
import { ImagePlus, X, ChevronLeft, ChevronRight } from 'lucide-react'

type ImageItem = {
  id: string
  file: File
  previewUrl: string
  uploading: boolean
  uploadedUrl?: string
  error?: string
  width?: number
  height?: number
}

type Props = {
  images: ImageItem[]
  onImagesChange: (images: ImageItem[]) => void
  onUpload: (file: File) => Promise<string>
  onRemoveUploaded?: (url: string) => Promise<void>
  maxImages?: number
  maxSizeMb?: number
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_DIMENSION = 800

async function convertToWebP(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => blob ? resolve({ blob, width, height }) : reject(new Error('Conversion WebP échouée')),
        'image/webp',
        0.85
      )
    }
    img.onerror = () => reject(new Error('Impossible de charger l\'image'))
    img.src = URL.createObjectURL(file)
  })
}

export function UploadPublicationImages({
  images,
  onImagesChange,
  onUpload,
  onRemoveUploaded,
  maxImages = 10,
  maxSizeMb = 5,
}: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const remaining = maxImages - images.length
    const toProcess = arr.slice(0, remaining)

    const newItems: ImageItem[] = toProcess
      .filter((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) return false
        if (f.size > maxSizeMb * 1024 * 1024) return false
        return true
      })
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        uploading: true,
      }))

    let current = [...images, ...newItems]
    onImagesChange(current)

    for (const item of newItems) {
      try {
        const { blob: webpBlob, width, height } = await convertToWebP(item.file)
        const webpFile = new File([webpBlob], `${item.id}.webp`, { type: 'image/webp' })
        const url = await onUpload(webpFile)
        current = current.map((img) => img.id === item.id ? { ...img, uploading: false, uploadedUrl: url, width, height } : img)
        onImagesChange([...current])
      } catch {
        current = current.map((img) => img.id === item.id ? { ...img, uploading: false, error: 'Échec de l\'upload' } : img)
        onImagesChange([...current])
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  async function removeImage(id: string) {
    const img = images.find((i) => i.id === id)
    if (img?.uploadedUrl && onRemoveUploaded) {
      await onRemoveUploaded(img.uploadedUrl).catch(() => {})
    }
    URL.revokeObjectURL(img?.previewUrl ?? '')
    onImagesChange(images.filter((i) => i.id !== id))
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= images.length) return
    const next = [...images]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    onImagesChange(next)
  }

  const canAdd = images.length < maxImages

  return (
    <div>
      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div className="mb-4 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 transition-shadow duration-150 hover:shadow-md"
            >
              <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />

              {/* Upload spinner */}
              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-0/70 backdrop-blur-[2px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              )}

              {/* Error state */}
              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-error/10">
                  <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-medium text-white">Erreur</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-neutral-900/0 opacity-0 transition-all duration-150 group-hover:bg-neutral-900/40 group-hover:opacity-100">
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-0/90 text-neutral-600 shadow-sm transition hover:bg-neutral-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Reorder arrows */}
                {images.length > 1 && (
                  <div className="flex gap-0.5">
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImage(i, i - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-0/90 text-neutral-600 shadow-sm"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                    )}
                    {i < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImage(i, i + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-0/90 text-neutral-600 shadow-sm"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Position badge */}
              {images.length > 1 && (
                <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900/60 text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-150 ${
            dragOver
              ? 'border-accent bg-accent-soft/50'
              : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-150 ${
            dragOver ? 'bg-accent/10 text-accent' : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200 group-hover:text-neutral-600'
          }`}>
            <ImagePlus className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-accent' : 'text-neutral-600'}`}>
              {images.length === 0 ? 'Ajouter des images' : 'Ajouter d\'autres images'}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              JPEG, PNG ou WebP · max {maxSizeMb} Mo · {images.length}/{maxImages}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}
    </div>
  )
}

export type { ImageItem }
