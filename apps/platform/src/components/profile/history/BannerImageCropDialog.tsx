'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg } from '@/lib/crop-utils'

interface BannerCropResult {
  blob: Blob
  aspect_ratio: number
}

interface Props {
  open: boolean
  imageUrl: string | null
  mode?: 'landscape' | 'square' // Ignored now since we let user choose
  fileType?: string
  onComplete: (result: BannerCropResult) => void
  onCancel: () => void
}

export function BannerImageCropDialog({
  open,
  imageUrl,
  onComplete,
  onCancel,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(16 / 9)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Default aspect based on what makes sense (e.g. 16:9 first)
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setAspect(16 / 9)
      setIsProcessing(false)
    }
  }, [open])

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageUrl || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels, 0)
      if (croppedBlob) {
        onComplete({ blob: croppedBlob, aspect_ratio: aspect })
      } else {
        onCancel()
      }
    } catch (e) {
      console.error(e)
      onCancel()
    } finally {
      setIsProcessing(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="hw-banner-crop">
      <div className="hw-banner-crop__backdrop" onClick={onCancel} />
      <div
        className="hw-banner-crop__panel"
        style={{ maxWidth: '800px', width: '90vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hist-banner-crop-title"
      >
        <h3 id="hist-banner-crop-title" className="hw-banner-crop__title">
          Recadrer l&apos;image
        </h3>
        
        {/* Aspect Ratio Selector */}
        <div className="flex gap-4 px-6 pt-4 pb-2 justify-center">
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-full transition-colors ${aspect === 1 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            onClick={() => setAspect(1)}
          >
            Carré (1:1)
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-full transition-colors ${aspect === 16 / 9 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            onClick={() => setAspect(16 / 9)}
          >
            Paysage (16:9)
          </button>
        </div>

        <p className="hw-banner-crop__hint px-6 m-0 text-center text-sm text-neutral-500 mb-4">
          Zoomez et déplacez l&apos;image pour ajuster le cadre.
        </p>

        <div className="relative w-full bg-neutral-900" style={{ height: '50vh', minHeight: '300px' }}>
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>
        
        {/* Zoom Slider */}
        <div className="px-6 py-4 flex items-center gap-4">
          <span className="text-sm text-neutral-500">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => {
              setZoom(Number(e.target.value))
            }}
            className="flex-1"
          />
        </div>

        <footer className="hw-banner-crop__foot mt-0">
          <button 
            type="button" 
            className="hist-edit__btn hist-edit__btn--ghost" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Annuler
          </button>
          <button 
            type="button" 
            className="hist-edit__btn hist-edit__btn--primary" 
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? 'Traitement...' : 'Valider'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
