'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { mountBannerImageCropper, type BannerCropMode, type BannerCropResult } from '@ibee/shared'

interface Props {
  open: boolean
  imageUrl: string | null
  mode: BannerCropMode
  fileType?: string
  onComplete: (result: BannerCropResult) => void
  onCancel: () => void
}

export function BannerImageCropDialog({
  open,
  imageUrl,
  mode,
  fileType,
  onComplete,
  onCancel,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const cropperRef = useRef<ReturnType<typeof mountBannerImageCropper> | null>(null)
  const sessionRef = useRef(0)

  useLayoutEffect(() => {
    if (shellRef.current && !cropperRef.current) {
      cropperRef.current = mountBannerImageCropper(shellRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open || !imageUrl || !cropperRef.current) return
    const session = ++sessionRef.current
    cropperRef.current.open(imageUrl, mode, fileType).then((result) => {
      if (session !== sessionRef.current) return
      if (result) onComplete(result)
      else onCancel()
    })
  }, [open, imageUrl, mode, fileType, onComplete, onCancel])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div ref={shellRef} className="hw-banner-crop">
      <div className="hw-banner-crop__backdrop" data-hw-banner-crop-backdrop />
      <div
        className="hw-banner-crop__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hist-banner-crop-title"
      >
        <h3 id="hist-banner-crop-title" className="hw-banner-crop__title">
          Recadrer l&apos;image
        </h3>
        <p className="hw-banner-crop__hint" data-hw-banner-crop-hint>
          Ajustez le cadre.
        </p>
        <div className="hw-banner-crop__stage">
          <div className="hw-banner-crop__frame">
            <img alt="" data-hw-banner-crop-img />
            <div className="hw-banner-crop__box" data-hw-banner-crop-box>
              <div className="hw-banner-crop__handle" data-hw-banner-crop-handle />
            </div>
          </div>
        </div>
        <footer className="hw-banner-crop__foot">
          <button type="button" className="hist-edit__btn hist-edit__btn--ghost" data-hw-banner-crop-cancel>
            Annuler
          </button>
          <button type="button" className="hist-edit__btn hist-edit__btn--primary" data-hw-banner-crop-confirm>
            Valider
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
