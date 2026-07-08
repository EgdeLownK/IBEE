'use client'

import { useRef, useState } from 'react'
import { ChevronDown, Image as ImageIcon, Loader2, Trash2, ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import {
  autoCropImageFromUrl,
  BANNER_ASPECT_MAX,
  clampBannerAspectRatio,
  imageMatchesBannerFormat,
  readImageMeta,
} from '@ibee/shared'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import { BannerImageCropDialog } from '../history/BannerImageCropDialog'
import type { ContentBlockDraft } from './types'

type ProductImageBlockDraft = Extract<ContentBlockDraft, { type: 'image' }>

function clampBlockAspect(ratio: number) {
  return clampBannerAspectRatio(ratio)
}

type CropRequest = {
  blockId: string
  slotIndex: number
  url: string
  mode: 'landscape' | 'square'
  fileType: string
}

interface Props {
  block: ProductImageBlockDraft
  onChange: (block: ProductImageBlockDraft) => void
}

export function ProductImageBlockEditor({ block, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceSlotRef = useRef<number | null>(null)
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null)

  const validImages = block.images.filter((img) => img?.url)
  const count = validImages.length
  
  const isSquare = count >= 2 || (count === 1 && block.uploading)
  const layout = isSquare ? 'square' : 'landscape'
  const isTriple = count === 3 || (count === 2 && block.uploading)

  const renderedImages = [...validImages]
  if (count === 0 || block.uploading) {
    renderedImages.push(null)
  }

  function patch(partial: Partial<ProductImageBlockDraft>) {
    onChange({ ...block, ...partial } as ProductImageBlockDraft)
  }

  async function uploadBlob(blob: Blob, aspectRatio: number, slotIndex: number) {
    patch({ uploading: true })
    const fd = new FormData()
    fd.append('file', blob, 'image.jpg')
    const result = await uploadProductMediaAction(fd)
    if (!result.ok) {
      patch({ uploading: false })
      throw new Error(result.error)
    }
    const newImages = [...validImages]
    newImages[slotIndex] = { url: result.url!, aspect_ratio: aspectRatio, type: 'image' }
    patch({ uploading: false, images: newImages, slot_count: Math.max(1, Math.min(newImages.length, 3)) as 1 | 2 | 3 })
  }

  async function uploadFile(file: File, aspectRatio: number, slotIndex: number) {
    patch({ uploading: true })
    const fd = new FormData()
    fd.append('file', file, file.name || 'image.jpg')
    const result = await uploadProductMediaAction(fd)
    if (!result.ok) {
      patch({ uploading: false })
      throw new Error(result.error)
    }
    const newImages = [...validImages]
    newImages[slotIndex] = { url: result.url!, aspect_ratio: aspectRatio, type: 'image' }
    patch({ uploading: false, images: newImages, slot_count: Math.max(1, Math.min(newImages.length, 3)) as 1 | 2 | 3 })
  }

  async function ingestFile(file: File, slotIndex: number) {
    const objectUrl = URL.createObjectURL(file)
    let openedCrop = false
    const mode = layout
    try {
      const meta = await readImageMeta(objectUrl)
      if (meta && imageMatchesBannerFormat(meta.width, meta.height, mode)) {
        const aspect = mode === 'square' ? 1 : clampBlockAspect(meta.width / meta.height)
        await uploadFile(file, aspect, slotIndex)
        return
      }
      if (mode === 'square') {
        const result = await autoCropImageFromUrl(objectUrl, 'square', file.type)
        if (!result) {
          await uploadFile(file, 1, slotIndex)
          return
        }
        await uploadBlob(result.blob, 1, slotIndex)
        return
      }
      openedCrop = true
      setCropRequest({
        blockId: block.id,
        slotIndex,
        url: objectUrl,
        mode: 'landscape',
        fileType: file.type,
      })
    } catch {
      await uploadFile(file, mode === 'square' ? 1 : BANNER_ASPECT_MAX, slotIndex)
    } finally {
      if (!openedCrop) URL.revokeObjectURL(objectUrl)
    }
  }

  function pickSlot(slotIndex: number) {
    if (block.uploading) return
    replaceSlotRef.current = slotIndex
    fileInputRef.current?.click()
  }

  function clearSlot(slotIndex: number) {
    const newImages = [...validImages]
    newImages.splice(slotIndex, 1)
    patch({ images: newImages, slot_count: Math.max(1, newImages.length) as 1 | 2 | 3 })
  }

  function moveImage(slotIndex: number, dir: -1 | 1) {
    const arr = [...validImages]
    if (slotIndex + dir < 0 || slotIndex + dir >= arr.length) return
    const temp = arr[slotIndex]
    arr[slotIndex] = arr[slotIndex + dir]
    arr[slotIndex + dir] = temp
    patch({ images: arr })
  }

  async function handleCropComplete(result: { blob: Blob; aspect_ratio: number }) {
    if (!cropRequest) return
    const slotIndex = cropRequest.slotIndex
    if (cropRequest.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(cropRequest.url)
      } catch {
        // ignore
      }
    }
    setCropRequest(null)
    try {
      await uploadBlob(result.blob, result.aspect_ratio, slotIndex)
    } catch {
      // parent shows toast
    }
  }

  function handleCropCancel() {
    if (cropRequest?.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(cropRequest.url)
      } catch {
        // ignore
      }
    }
    setCropRequest(null)
  }

  return (
    <div className="hist-edit__card-main" style={{ padding: 0 }}>
      <div className={`hw-config__banner-workspace${block.uploading ? ' is-uploading' : ''}`}>
        <div
          className={`hw-config__banner-row hw-config__banner-row--${layout}${isTriple ? ' hw-config__banner-row--triple' : ''}`}
        >
          {renderedImages.map((img, slotIndex) => {
            if (!img?.url) {
              return (
                <div
                  key={`empty-${slotIndex}`}
                  className={`hw-config__banner-slot hw-config__banner-slot--${layout} hw-config__banner-slot--empty`}
                >
                  <button
                    type="button"
                    className="hw-config__banner-slot-add"
                    aria-label="Ajouter une image"
                    onClick={() => pickSlot(slotIndex)}
                  >
                    <span className={`hw-config__banner-slot-frame hw-config__banner-slot-frame--${layout}`}>
                      <span className="hw-config__banner-slot-add-icon">
                        <ImageIcon className="h-5 w-5" />
                      </span>
                    </span>
                  </button>
                  {block.uploading && (
                    <div className="hw-config__banner-slot-loading">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                </div>
              )
            }

            const warn = layout === 'square' && Math.abs((img.aspect_ratio || 0) - 1) > 0.05
            return (
              <div
                key={`filled-${slotIndex}-${img.url}`}
                className={`hw-config__banner-slot hw-config__banner-slot--${layout}${warn ? ' hw-config__banner-slot--warn' : ''}`}
                style={layout === 'landscape' ? ({ '--banner-aspect': String(img.aspect_ratio) } as React.CSSProperties) : undefined}
              >
                <div className="hw-config__banner-slot-media">
                  <img src={img.url} alt="" draggable={false} />
                </div>
                
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  {slotIndex > 0 && (
                    <button
                      type="button"
                      className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md backdrop-blur-sm transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveImage(slotIndex, -1)
                      }}
                      aria-label="Déplacer à gauche"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {slotIndex < count - 1 && (
                    <button
                      type="button"
                      className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md backdrop-blur-sm transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveImage(slotIndex, 1)
                      }}
                      aria-label="Déplacer à droite"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="hw-config__banner-slot-hit"
                  aria-label="Modifier l'image"
                  onClick={() => pickSlot(slotIndex)}
                >
                  <span className="hw-config__banner-slot-edit">Modifier</span>
                </button>
                <button
                  type="button"
                  className="hw-config__banner-slot-remove"
                  aria-label="Supprimer l'image"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearSlot(slotIndex)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
        {count > 0 && count < 3 && !block.uploading && (
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={() => pickSlot(count)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Ajouter une autre image ({count}/3)
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          const slotIndex = replaceSlotRef.current
          if (!file || slotIndex == null) return
          try {
            await ingestFile(file, slotIndex)
          } catch (err) {
            console.error(err)
          }
        }}
      />

      <BannerImageCropDialog
        open={cropRequest != null}
        imageUrl={cropRequest?.url ?? null}
        mode={cropRequest?.mode ?? 'landscape'}
        fileType={cropRequest?.fileType}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    </div>
  )
}
