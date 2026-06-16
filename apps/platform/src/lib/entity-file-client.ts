import type { EntityFileDto } from '@/lib/entity-file-server'

export type { EntityFileDto }

export type ListEntityFilesResult =
  | { ok: true; files: EntityFileDto[] }
  | { ok: false; error: string }

export type EntityFileSignedUrlResult =
  | { ok: true; url: string; name: string; mime_type: string | null }
  | { ok: false; error: string }

export async function listEntityFiles(): Promise<ListEntityFilesResult> {
  const res = await fetch('/api/dashboard/entity-files')
  if (!res.ok) return { ok: false, error: 'Erreur réseau.' }
  return (await res.json()) as ListEntityFilesResult
}

export async function getEntityFileSignedUrl(fileId: string): Promise<EntityFileSignedUrlResult> {
  const params = new URLSearchParams({ fileId })
  const res = await fetch(`/api/dashboard/entity-files/signed-url?${params}`)
  if (!res.ok) return { ok: false, error: 'Erreur réseau.' }
  return (await res.json()) as EntityFileSignedUrlResult
}
