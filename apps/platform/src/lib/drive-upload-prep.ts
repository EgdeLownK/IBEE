import {
  DRIVE_MAX_FILE_BYTES,
  DRIVE_VIDEO_CLIENT_COMPRESS_MAX_BYTES,
  fileExtension,
  getDrivePreviewKind,
} from '@/lib/drive-file-policy'

export type DriveUploadPrepResult = {
  file: File
  compressed: boolean
  originalSize: number
  finalSize: number
}

const IMAGE_MAX_EDGE = 3840
const IMAGE_MIN_COMPRESS_BYTES = 400 * 1024
const IMAGE_QUALITY = 0.82
const SKIP_IMAGE_EXT = new Set(['svg', 'gif'])

function replaceExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '') || name
  return `${base}.${ext}`
}

async function compressDriveImage(file: File): Promise<File | null> {
  const ext = fileExtension(file.name)
  if (SKIP_IMAGE_EXT.has(ext)) return null

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      const maxEdge = Math.max(width, height)
      if (maxEdge > IMAGE_MAX_EDGE) {
        const ratio = IMAGE_MAX_EDGE / maxEdge
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(null)
            return
          }
          resolve(
            new File([blob], replaceExtension(file.name, 'webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            }),
          )
        },
        'image/webp',
        IMAGE_QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }

    img.src = objectUrl
  })
}

async function compressDriveVideo(file: File): Promise<File | null> {
  if (file.size > DRIVE_VIDEO_CLIENT_COMPRESS_MAX_BYTES) return null

  try {
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])

    const ffmpeg = new FFmpeg()
    const coreVersion = '0.12.10'

    await ffmpeg.load({
      coreURL: await toBlobURL(
        `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${coreVersion}/dist/esm/ffmpeg-core.js`,
        'text/javascript',
      ),
      wasmURL: await toBlobURL(
        `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${coreVersion}/dist/esm/ffmpeg-core.wasm`,
        'application/wasm',
      ),
    })

    const inputName = `input.${fileExtension(file.name) || 'mp4'}`
    const outputName = 'output.mp4'

    await ffmpeg.writeFile(inputName, await fetchFile(file))
    await ffmpeg.exec([
      '-i',
      inputName,
      '-vf',
      "scale='min(1920,iw)':-2",
      '-c:v',
      'libx264',
      '-crf',
      '28',
      '-preset',
      'fast',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      outputName,
    ])

    const data = await ffmpeg.readFile(outputName)
    if (!(data instanceof Uint8Array) || data.byteLength === 0 || data.byteLength >= file.size) {
      return null
    }

    return new File([new Uint8Array(data)], replaceExtension(file.name, 'mp4'), {
      type: 'video/mp4',
      lastModified: Date.now(),
    })
  } catch {
    return null
  }
}

export async function prepareDriveUploadFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<DriveUploadPrepResult> {
  const originalSize = file.size
  const kind = getDrivePreviewKind(file.type, file.name)

  if (kind === 'image' && file.size >= IMAGE_MIN_COMPRESS_BYTES) {
    onProgress?.('Compression de l’image…')
    const compressed = await compressDriveImage(file)
    if (compressed && compressed.size <= DRIVE_MAX_FILE_BYTES) {
      return {
        file: compressed,
        compressed: true,
        originalSize,
        finalSize: compressed.size,
      }
    }
  }

  if (kind === 'video' && file.size <= DRIVE_VIDEO_CLIENT_COMPRESS_MAX_BYTES) {
    onProgress?.('Compression de la vidéo…')
    const compressed = await compressDriveVideo(file)
    if (compressed && compressed.size <= DRIVE_MAX_FILE_BYTES) {
      return {
        file: compressed,
        compressed: true,
        originalSize,
        finalSize: compressed.size,
      }
    }
  }

  return {
    file,
    compressed: false,
    originalSize,
    finalSize: file.size,
  }
}
