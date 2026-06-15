import sharp from 'sharp'
import { fileExtension, getDrivePreviewKind } from '@/lib/drive-file-policy'

const IMAGE_MAX_EDGE = 3840
const IMAGE_QUALITY = 82
const SKIP_IMAGE_EXT = new Set(['svg', 'gif'])

export type ProcessedDriveUpload = {
  buffer: Buffer
  fileName: string
  mimeType: string
  sizeBytes: number
  compressed: boolean
}

function replaceExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '') || name
  return `${base}.${ext}`
}

export async function processDriveUploadFile(file: File): Promise<ProcessedDriveUpload> {
  const input = Buffer.from(await file.arrayBuffer())
  const kind = getDrivePreviewKind(file.type, file.name)
  const ext = fileExtension(file.name)

  if (kind !== 'image' || SKIP_IMAGE_EXT.has(ext)) {
    return {
      buffer: input,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: input.byteLength,
      compressed: false,
    }
  }

  try {
    const output = await sharp(input)
      .rotate()
      .resize({
        width: IMAGE_MAX_EDGE,
        height: IMAGE_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer()

    if (output.byteLength >= input.byteLength) {
      return {
        buffer: input,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: input.byteLength,
        compressed: false,
      }
    }

    return {
      buffer: output,
      fileName: replaceExtension(file.name, 'webp'),
      mimeType: 'image/webp',
      sizeBytes: output.byteLength,
      compressed: true,
    }
  } catch {
    return {
      buffer: input,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: input.byteLength,
      compressed: false,
    }
  }
}
