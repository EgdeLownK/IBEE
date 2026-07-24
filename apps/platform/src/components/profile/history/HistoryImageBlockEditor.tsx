'use client'

import { useRef, useState } from 'react'
import { ChevronDown, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import {
  autoCropImageFromUrl,
  BANNER_ASPECT_MAX,
  imageMatchesBannerFormat,
  readImageMeta,
} from '@ibee/shared'
import { uploadHistoryImageAction } from '@/app/dashboard/site/history-actions'
import { BannerImageCropDialog } from './BannerImageCropDialog'
import {
  blockCropMode,
  blockSlotCount,
  clampBlockAspect,
  getBlockImageSaveError,
  type DraftImageBlock,
} from './history-edit-utils'

type CropRequest = {
  blockId: string
  slotIndex: number
  url: string
  mode: 'landscape' | 'square'
  fileType: string
}

interface Props {
  block: DraftImageBlock
  onChange: (block: DraftImageBlock) => void
}

export function HistoryImageBlockEditor({ block, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceSlotRef = useRef<number | null>(null)
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null)

  const slots = blockSlotCount(block)
  const layout = slots === 1 ? 'landscape' : 'square'
  const blockError = getBlockImageSaveError(block)
  const mode = blockCropMode(block)

  function patch(partial: Partial<DraftImageBlock>) {
    onChange({ ...block, ...partial })
  }

  function setSlotCount(next: 1 | 2 | 3) {
    if (next === slots) return
    const images = [...block.images]
    if (images.length > next) images.length = next
    while (images.length < next) images.push(null)
    if (next > 1) {
      for (let i = 0; i < next; i++) {
        if (images[i]) images[i] = { ...images[i]!, aspect_ratio: 1 }
      }
    } else if (images[0]) {
      images[0] = { ...images[0], aspect_ratio: clampBlockAspect(images[0].aspect_ratio) }
    }
    patch({ slot_count: next, images })
  }

  async function uploadBlob(blob: Blob, aspectRatio: number, slotIndex: number) {
    patch({ uploading: true })
    const fd = new FormData()
    fd.append('file', blob, 'image.jpg')
    const result = await uploadHistoryImageAction(fd)
    patch({ uploading: false })
    if (!result.ok) throw new Error(result.error)
    const images = [...block.images]
    while (images.length < slots) images.push(null)
    images[slotIndex] = { url: result.url, aspect_ratio: aspectRatio }
    patch({ images })
  }

  async function uploadFile(file: File, aspectRatio: number, slotIndex: number) {
    patch({ uploading: true })
    const fd = new FormData()
    fd.append('file', file, file.name || 'image.jpg')
    const result = await uploadHistoryImageAction(fd)
    patch({ uploading: false })
    if (!result.ok) throw new Error(result.error)
    const images = [...block.images]
    while (images.length < slots) images.push(null)
    images[slotIndex] = { url: result.url, aspect_ratio: aspectRatio }
    patch({ images })
  }

  async function ingestFile(file: File, slotIndex: number) {
    const objectUrl = URL.createObjectURL(file)
    let openedCrop = false
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
    const images = [...block.images]
    images[slotIndex] = null
    while (images.length > 0 && !images[images.length - 1]) images.pop()
    patch({ images })
  }

  async function handleCropComplete(result: { blob: Blob; aspect_ratio: number }) {
    if (!cropRequest) return
    const slotIndex = cropRequest.slotIndex
    if (cropRequest.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(cropRequest.url)
      } catch {
        /* ignore */
      }
    }
    setCropRequest(null)
    try {
      await uploadBlob(result.blob, result.aspect_ratio, slotIndex)
    } catch {
      /* parent shows toast */
    }
  }

  function handleCropCancel() {
    if (cropRequest?.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(cropRequest.url)
      } catch {
        /* ignore */
      }
    }
    setCropRequest(null)
  }

  return (
    <>
      <div className="hist-edit__img-format">
        <span className="hist-edit__img-format-label">Format visuel</span>
        <div className="hist-edit__img-format-picker">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              className={`hist-edit__img-format-btn${slots === n ? ' is-active' : ''}`}
              aria-pressed={slots === n}
              onClick={() => setSlotCount(n)}
            >
              <span
                className={`hist-edit__layout-icon hist-edit__layout-icon--${n === 1 ? 'landscape' : 'square'}`}
                aria-hidden="true"
              >
                {n === 1 ? (
                  <i />
                ) : (
                  <span style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: n }).map((_, i) => (
                      <i key={i} style={{ width: 14, height: 14 }} />
                    ))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`hw-config__banner-workspace${block.uploading ? ' is-uploading' : ''}${blockError ? ' has-error' : ''}`}
      >
        {blockError && <p className="hist-edit__block-error">{blockError}</p>}
        <div
          className={`hw-config__banner-row hw-config__banner-row--${layout}${slots === 3 ? ' hw-config__banner-row--triple' : ''}`}
        >
          {Array.from({ length: slots }).map((_, slotIndex) => {
            const img = block.images[slotIndex]
            if (!img?.url) {
              return (
                <div
                  key={slotIndex}
                  className={`hw-config__banner-slot hw-config__banner-slot--${layout} hw-config__banner-slot--empty`}
                >
                  <button
                    type="button"
                    className="hw-config__banner-slot-add"
                    aria-label="Ajouter une image"
                    onClick={() => pickSlot(slotIndex)}
                  >
                    <span
                      className={`hw-config__banner-slot-frame hw-config__banner-slot-frame--${layout}`}
                    >
                      <span className="hw-config__banner-slot-add-icon">
                        <ImageIcon className="h-5 w-5" />
                      </span>
                    </span>
                  </button>
                </div>
              )
            }

            const warn = slots > 1 && Math.abs((img.aspect_ratio || 0) - 1) > 0.05
            return (
              <div
                key={slotIndex}
                className={`hw-config__banner-slot hw-config__banner-slot--${layout}${warn ? ' hw-config__banner-slot--warn' : ''}`}
                style={
                  slots === 1
                    ? ({ '--banner-aspect': String(img.aspect_ratio) } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="hw-config__banner-slot-media">
                  <img src={img.url} alt="" draggable={false} />
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
                  onClick={() => clearSlot(slotIndex)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {block.uploading && (
                  <div className="hw-config__banner-slot-loading">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <details className="hist-edit__img-advanced">
        <summary className="hist-edit__img-advanced-summary">
          Référencement <span className="hist-edit__optional">(optionnel)</span>
          <ChevronDown className="hist-edit__img-advanced-chevron h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="hist-edit__img-advanced-body">
          <label className="hist-edit__img-alt-field">
            <span className="hist-edit__img-alt-label">Titre interne</span>
            <input
              type="text"
              className="hist-edit__img-alt-input"
              value={block.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Pour le référencement uniquement"
            />
          </label>
          <label className="hist-edit__img-alt-field">
            <span className="hist-edit__img-alt-label">Description interne</span>
            <input
              type="text"
              className="hist-edit__img-alt-input"
              value={block.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Non affichée sur le profil"
            />
          </label>
        </div>
      </details>

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
    </>
  )
}
