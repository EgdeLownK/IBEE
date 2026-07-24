'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

type AvatarCropperModalProps = {
  imageSrc: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  )
}

export function AvatarCropperModal({ imageSrc, onConfirm, onCancel }: AvatarCropperModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setCrop(centerAspectCrop(img.width, img.height))
  }, [])

  function handleConfirm() {
    if (!completedCrop || !imgRef.current) return

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const cropWidth = completedCrop.width * scaleX
    const cropHeight = completedCrop.height * scaleY
    const size = Math.min(800, Math.max(cropWidth, cropHeight))

    canvas.width = size
    canvas.height = size

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      size,
      size,
    )

    canvas.toBlob(
      (blob: Blob | null) => {
        if (blob) onConfirm(blob)
      },
      'image/webp',
      0.85,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm">
      <div className="w-full max-w-[600px] rounded-xl bg-neutral-0 p-6 shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Recadrer votre photo</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Ajustez le cadre pour qu&#39;il mette en valeur votre visage.
          </p>
        </div>

        <div className="flex max-h-[400px] items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
          <ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop} aspect={1}>
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Image à recadrer"
              onLoad={onImageLoad}
              style={{ maxHeight: '400px' }}
            />
          </ReactCrop>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!completedCrop}
            className="rounded-md bg-cta-primary px-4 py-2 text-sm font-medium text-neutral-0 transition duration-200 hover:bg-cta-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}
