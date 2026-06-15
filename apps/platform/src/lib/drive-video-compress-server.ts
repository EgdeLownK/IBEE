import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegStatic from 'ffmpeg-static'
import { fileExtension } from '@/lib/drive-file-policy'

export type ServerVideoCompressResult =
  | {
      ok: true
      compressed: true
      buffer: Buffer
      fileName: string
      mimeType: string
      originalSize: number
      finalSize: number
    }
  | {
      ok: true
      compressed: false
      originalSize: number
      finalSize: number
    }
  | { ok: false; error: string }

function replaceExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '') || name
  return `${base}.${ext}`
}

function runFfmpeg(inputUrl: string, outputPath: string): Promise<void> {
  const ffmpegPath = ffmpegStatic
  if (!ffmpegPath) {
    return Promise.reject(new Error('FFmpeg indisponible sur cette plateforme.'))
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputUrl,
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
      '-y',
      outputPath,
    ]

    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `FFmpeg a échoué (code ${code}).`))
    })
  })
}

export async function compressDriveVideoFromUrl(
  inputUrl: string,
  originalFileName: string,
  originalSize: number,
): Promise<ServerVideoCompressResult> {
  const workDir = await mkdtemp(join(tmpdir(), 'ibee-drive-video-'))
  const outputPath = join(workDir, `output.${fileExtension(originalFileName) || 'mp4'}`)

  try {
    await runFfmpeg(inputUrl, outputPath)

    const outputStat = await stat(outputPath)
    if (outputStat.size <= 0 || outputStat.size >= originalSize) {
      return {
        ok: true,
        compressed: false,
        originalSize,
        finalSize: originalSize,
      }
    }

    const buffer = await readFile(outputPath)
    return {
      ok: true,
      compressed: true,
      buffer,
      fileName: replaceExtension(originalFileName, 'mp4'),
      mimeType: 'video/mp4',
      originalSize,
      finalSize: buffer.byteLength,
    }
  } catch (err) {
    console.error('[compressDriveVideoFromUrl]', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Compression vidéo impossible.',
    }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
