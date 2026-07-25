/** Recadrage bannière : paysage (1 img) ou carré 1:1 (2–3 img). */

const AR_MIN = 1
const AR_MAX = 16 / 9
const MIN_CROP_PX = 48
const MAX_OUTPUT_W = 1920

export type BannerCropMode = 'landscape' | 'square'

export type BannerCropResult = {
  blob: Blob
  aspect_ratio: number
}

export type BannerImageMeta = {
  width: number
  height: number
}

const AR_TOLERANCE = 0.02

type CropRect = { x: number; y: number; w: number; h: number }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function clampAspect(ratio: number) {
  return clamp(ratio, AR_MIN, AR_MAX)
}

/** Plus grand cadrage centré au ratio cible (équivalent object-fit: cover). */
export function coverCrop(imgW: number, imgH: number, targetAR: number): CropRect {
  if (!imgW || !imgH || !targetAR) {
    return { x: 0, y: 0, w: 1, h: 1 }
  }

  const imgAR = imgW / imgH
  let w: number
  let h: number

  if (imgAR > targetAR) {
    h = imgH
    w = h * targetAR
  } else {
    w = imgW
    h = w / targetAR
  }

  return {
    x: (imgW - w) / 2,
    y: (imgH - h) / 2,
    w,
    h,
  }
}

function defaultCrop(mode: BannerCropMode, imgW: number, imgH: number): CropRect {
  if (!imgW || !imgH) {
    return { x: 0, y: 0, w: 1, h: 1 }
  }
  if (mode === 'square') {
    return coverCrop(imgW, imgH, 1)
  }
  return coverCrop(imgW, imgH, clampAspect(imgW / imgH))
}

function clampCrop(rect: CropRect, imgW: number, imgH: number, mode: BannerCropMode): CropRect {
  let { x, y, w, h } = rect

  if (mode === 'square') {
    const size = clamp(Math.max(w, h), MIN_CROP_PX, Math.min(imgW, imgH))
    w = size
    h = size
  } else {
    w = clamp(w, MIN_CROP_PX, imgW)
    h = clamp(h, MIN_CROP_PX, imgH)
    const ar = w / h
    if (ar < AR_MIN) w = h * AR_MIN
    if (ar > AR_MAX) h = w / AR_MAX
    w = clamp(w, MIN_CROP_PX, imgW)
    h = clamp(h, MIN_CROP_PX, imgH)
  }

  x = clamp(x, 0, Math.max(0, imgW - w))
  y = clamp(y, 0, Math.max(0, imgH - h))

  if (x + w > imgW) w = imgW - x
  if (y + h > imgH) h = imgH - y

  if (mode === 'square') {
    const size = Math.min(w, h)
    w = size
    h = size
    x = clamp(x, 0, imgW - w)
    y = clamp(y, 0, imgH - h)
  } else {
    const ar = w / h
    if (ar < AR_MIN) w = h * AR_MIN
    if (ar > AR_MAX) h = w / AR_MAX
    if (x + w > imgW) {
      w = imgW - x
      h = w / clampAspect(w / h)
    }
    if (y + h > imgH) {
      h = imgH - y
      w = h * clampAspect(w / h)
    }
  }

  return { x, y, w, h }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob | null> {
  const type = mime === 'image/png' ? 'image/png' : 'image/webp'
  const quality = type === 'image/png' ? undefined : 0.88
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function cropNaturalToBlob(
  image: HTMLImageElement,
  rect: CropRect,
  mime: string,
): Promise<Blob | null> {
  const safeW = Math.max(1, Math.round(rect.w))
  const safeH = Math.max(1, Math.round(rect.h))
  const safeX = Math.max(0, Math.round(rect.x))
  const safeY = Math.max(0, Math.round(rect.y))

  let outW = safeW
  let outH = safeH

  if (outW > MAX_OUTPUT_W) {
    const s = MAX_OUTPUT_W / outW
    outW = MAX_OUTPUT_W
    outH = Math.round(outH * s)
  }

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  ctx.drawImage(image, safeX, safeY, safeW, safeH, 0, 0, outW, outH)
  return canvasToBlob(canvas, mime)
}

function displayRectToNatural(
  image: HTMLImageElement,
  rect: CropRect,
  displayW: number,
  displayH: number,
  cropMode: BannerCropMode,
): CropRect {
  if (displayW > 0 && displayH > 0) {
    const scaleX = image.naturalWidth / displayW
    const scaleY = image.naturalHeight / displayH
    return {
      x: rect.x * scaleX,
      y: rect.y * scaleY,
      w: rect.w * scaleX,
      h: rect.h * scaleY,
    }
  }
  return clampCrop(
    defaultCrop(cropMode, image.naturalWidth, image.naturalHeight),
    image.naturalWidth,
    image.naturalHeight,
    cropMode,
  )
}

function loadImageElement(imageUrl: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image illisible'))
    img.src = imageUrl
  })
}

async function fetchImageBlobUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error('fetch failed')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

async function loadImageForCrop(imageUrl: string): Promise<HTMLImageElement> {
  if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
    return loadImageElement(imageUrl)
  }

  try {
    const blobUrl = await fetchImageBlobUrl(imageUrl)
    try {
      return await loadImageElement(blobUrl)
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  } catch {
    return loadImageElement(imageUrl, true)
  }
}

export function imageMatchesBannerFormat(
  width: number,
  height: number,
  mode: BannerCropMode,
): boolean {
  if (!width || !height) return false
  const ar = width / height
  if (mode === 'square') return Math.abs(ar - 1) <= AR_TOLERANCE
  return ar >= AR_MIN - AR_TOLERANCE && ar <= AR_MAX + AR_TOLERANCE
}

export async function readImageMeta(imageUrl: string): Promise<BannerImageMeta | null> {
  try {
    const img = await loadImageForCrop(imageUrl)
    const width = img.naturalWidth
    const height = img.naturalHeight
    if (!width || !height) return null
    return { width, height }
  } catch {
    return null
  }
}

export async function autoCropImageFromUrl(
  imageUrl: string,
  cropMode: BannerCropMode,
  fileType = 'image/jpeg',
): Promise<BannerCropResult | null> {
  try {
    const img = await loadImageForCrop(imageUrl)
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null

    const mime = fileType && fileType.startsWith('image/') ? fileType : 'image/jpeg'
    const rect = cropMode === 'square' ? coverCrop(w, h, 1) : coverCrop(w, h, clampAspect(w / h))

    const blob = await cropNaturalToBlob(img, rect, mime)
    if (!blob) return null

    const aspect_ratio = cropMode === 'square' ? 1 : clampAspect(rect.w / rect.h)
    return { blob, aspect_ratio }
  } catch {
    return null
  }
}

export function mountBannerImageCropper(shell: HTMLElement) {
  let mode: BannerCropMode = 'landscape'
  let crop: CropRect = { x: 0, y: 0, w: 0, h: 0 }
  let imgW = 0
  let imgH = 0
  let mime = 'image/jpeg'
  let resolvePending: ((v: BannerCropResult | null) => void) | null = null
  let displayUrlToRevoke: string | null = null

  const img = shell.querySelector('[data-hw-banner-crop-img]') as HTMLImageElement | null
  const box = shell.querySelector('[data-hw-banner-crop-box]') as HTMLElement | null
  const handle = shell.querySelector('[data-hw-banner-crop-handle]') as HTMLElement | null
  const hintEl = shell.querySelector('[data-hw-banner-crop-hint]')
  const btnCancel = shell.querySelector('[data-hw-banner-crop-cancel]')
  const btnConfirm = shell.querySelector('[data-hw-banner-crop-confirm]')

  if (!img || !box || !handle) return

  function layoutSize() {
    imgW = img!.clientWidth
    imgH = img!.clientHeight
  }

  function paint() {
    box!.style.left = crop.x + 'px'
    box!.style.top = crop.y + 'px'
    box!.style.width = crop.w + 'px'
    box!.style.height = crop.h + 'px'
  }

  function applyMode(next: BannerCropMode) {
    mode = next
    if (hintEl) {
      hintEl.textContent =
        mode === 'square'
          ? 'Format carré 1:1 — ajustez le cadre.'
          : 'Format paysage — ratio libre de 1:1 à 16:9.'
    }
    layoutSize()
    if (!imgW || !imgH) return
    crop = clampCrop(defaultCrop(mode, imgW, imgH), imgW, imgH, mode)
    paint()
  }

  function revokeDisplayUrl() {
    if (displayUrlToRevoke) {
      URL.revokeObjectURL(displayUrlToRevoke)
      displayUrlToRevoke = null
    }
  }

  function finish(result: BannerCropResult | null) {
    revokeDisplayUrl()
    shell.hidden = true
    document.body.style.overflow = ''
    const resolve = resolvePending
    resolvePending = null
    if (resolve) resolve(result)
  }

  function scheduleApplyMode(next: BannerCropMode) {
    const tryApply = () => {
      layoutSize()
      if (!img!.naturalWidth) return
      if (imgW > 0 && imgH > 0) {
        applyMode(next)
        return
      }
      requestAnimationFrame(tryApply)
    }
    requestAnimationFrame(tryApply)
  }

  function onConfirm() {
    if (!img!.naturalWidth || !img!.naturalHeight) return
    layoutSize()
    const naturalRect = displayRectToNatural(img!, crop, imgW, imgH, mode)
    const safeRect = clampCrop(naturalRect, img!.naturalWidth, img!.naturalHeight, mode)

    cropNaturalToBlob(img!, safeRect, mime).then((blob) => {
      if (!blob) {
        alert('Recadrage impossible. Réessayez.')
        finish(null)
        return
      }
      const aspect = mode === 'square' ? 1 : clampAspect(safeRect.w / safeRect.h)
      finish({ blob, aspect_ratio: aspect })
    })
  }

  btnCancel?.addEventListener('click', () => finish(null))
  btnConfirm?.addEventListener('click', (e) => {
    e.preventDefault()
    onConfirm()
  })
  shell
    .querySelector('[data-hw-banner-crop-backdrop]')
    ?.addEventListener('click', () => finish(null))

  img.addEventListener('load', () => scheduleApplyMode(mode))

  let drag: { type: 'move' | 'resize'; startX: number; startY: number; base: CropRect } | null =
    null

  function onPointerMove(e: PointerEvent) {
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const next = { ...drag.base }

    if (drag.type === 'move') {
      next.x += dx
      next.y += dy
    } else {
      next.w = drag.base.w + dx
      next.h = drag.base.h + dy
      if (mode === 'square') {
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy
        next.w = drag.base.w + delta
        next.h = next.w
      }
    }

    crop = clampCrop(next, imgW, imgH, mode)
    paint()
  }

  function onPointerUp() {
    drag = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  function startDrag(type: 'move' | 'resize', e: PointerEvent) {
    e.preventDefault()
    layoutSize()
    drag = { type, startX: e.clientX, startY: e.clientY, base: { ...crop } }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  box.addEventListener('pointerdown', (e) => {
    if (e.target === handle) return
    startDrag('move', e)
  })
  handle.addEventListener('pointerdown', (e) => startDrag('resize', e))

  function open(
    imageUrl: string,
    cropMode: BannerCropMode,
    fileType?: string,
  ): Promise<BannerCropResult | null> {
    if (resolvePending) resolvePending(null)

    mime = fileType && fileType.startsWith('image/') ? fileType : 'image/jpeg'
    revokeDisplayUrl()

    return new Promise((resolve) => {
      resolvePending = resolve
      shell.hidden = false
      document.body.style.overflow = 'hidden'
      mode = cropMode

      const showImage = (displayUrl: string) => {
        img!.removeAttribute('crossorigin')
        img!.src = displayUrl
        if (img!.complete && img!.naturalWidth) {
          scheduleApplyMode(cropMode)
        }
      }

      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        showImage(imageUrl)
        return
      }

      fetchImageBlobUrl(imageUrl)
        .then((blobUrl) => {
          displayUrlToRevoke = blobUrl
          showImage(blobUrl)
        })
        .catch(() => {
          img!.crossOrigin = 'anonymous'
          showImage(imageUrl)
        })
    })
  }

  return { open }
}

declare global {
  interface Window {
    __ibeeBannerCropOpen?: (
      url: string,
      mode: BannerCropMode,
      type?: string,
    ) => Promise<BannerCropResult | null>
    __ibeeBannerAutoCrop?: (
      url: string,
      mode: BannerCropMode,
      type?: string,
    ) => Promise<BannerCropResult | null>
    __ibeeBannerReadMeta?: (url: string) => Promise<BannerImageMeta | null>
    __ibeeBannerMatchesFormat?: (width: number, height: number, mode: BannerCropMode) => boolean
  }
}

export function registerBannerImageCropper() {
  const shell = document.querySelector('[data-hw-banner-crop]') as HTMLElement | null
  if (!shell) return
  const api = mountBannerImageCropper(shell)
  if (!api) return
  window.__ibeeBannerCropOpen = api.open
  window.__ibeeBannerAutoCrop = autoCropImageFromUrl
  window.__ibeeBannerReadMeta = readImageMeta
  window.__ibeeBannerMatchesFormat = imageMatchesBannerFormat
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerBannerImageCropper)
  } else {
    registerBannerImageCropper()
  }
}
