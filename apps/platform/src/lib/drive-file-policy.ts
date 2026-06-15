export const DRIVE_MAX_FILE_BYTES = 500 * 1024 * 1024
export const DRIVE_MAX_FILE_MB = 500
export const DRIVE_QUOTA_GB = 50
export const DRIVE_QUOTA_BYTES = DRIVE_QUOTA_GB * 1_000_000_000

/** Vidéos au-delà de ce seuil sont envoyées telles quelles (limite mémoire navigateur). */
export const DRIVE_VIDEO_CLIENT_COMPRESS_MAX_BYTES = 80 * 1024 * 1024

export type DrivePreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none'

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
])

const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'])

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac'])
const TEXT_EXT = new Set(['txt', 'csv', 'json', 'md', 'log'])

export function fileExtension(name: string): string {
  return (name.split('.').pop() || '').toLowerCase()
}

export function getDrivePreviewKind(mimeType: string | null, fileName: string): DrivePreviewKind {
  const mime = (mimeType || '').toLowerCase()
  const ext = fileExtension(fileName)

  if (IMAGE_MIME.has(mime) || IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_MIME.has(mime) || VIDEO_EXT.has(ext)) return 'video'
  if (AUDIO_MIME.has(mime) || AUDIO_EXT.has(ext)) return 'audio'
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.startsWith('text/') || TEXT_EXT.has(ext) || mime === 'application/json') return 'text'

  return 'none'
}

export function canPreviewInBrowser(kind: DrivePreviewKind): boolean {
  return kind !== 'none'
}

export function validateDriveUpload(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size === 0) {
    return { ok: false, error: 'Le fichier est vide.' }
  }
  if (file.size > DRIVE_MAX_FILE_BYTES) {
    return { ok: false, error: `Le fichier ne doit pas dépasser ${DRIVE_MAX_FILE_MB} Mo.` }
  }
  return { ok: true }
}

export function shouldUseDirectDriveUpload(file: File): boolean {
  return (
    getDrivePreviewKind(file.type, file.name) === 'video' &&
    file.size > DRIVE_VIDEO_CLIENT_COMPRESS_MAX_BYTES
  )
}

/** Texte affiché dans l’UI Drive / produit digital */
export function driveUploadHint(): string {
  return `Tous types · max ${DRIVE_MAX_FILE_MB} Mo · compression auto · vidéos lourdes envoyées en direct puis optimisées côté serveur`
}

/** Formats recommandés pour produits digitaux (métadonnée, pas bloquant) */
export const DIGITAL_PRODUCT_FORMATS = ['pdf', 'epub', 'mp4', 'mp3', 'zip'] as const

export function digitalFormatFromName(name: string): string {
  const ext = fileExtension(name)
  return (DIGITAL_PRODUCT_FORMATS as readonly string[]).includes(ext) ? ext : 'other'
}
