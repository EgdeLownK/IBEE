'use client'

import { useRef, useState } from 'react'
import { Type, Image as ImageIcon, List, ChevronUp, ChevronDown, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ServiceHighlightsEditor } from './ServiceHighlightsEditor'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type ContentBlock =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string; alt: string; uploading?: boolean }
  | { id: string; type: 'list'; items: string[] }

let blockIdCounter = 0
export function newBlockId() {
  return `block-${++blockIdCounter}-${Date.now()}`
}

type Props = {
  entityId: string
  value: ContentBlock[]
  onChange: (next: ContentBlock[]) => void
  onError?: (message: string) => void
}

export function ServiceContentBuilder({ entityId, value, onChange, onError }: Props) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)

  const addBlock = (type: ContentBlock['type']) => {
    const base = { id: newBlockId() }
    const block: ContentBlock =
      type === 'text'
        ? { ...base, type: 'text', content: '' }
        : type === 'image'
        ? { ...base, type: 'image', url: '', alt: '' }
        : { ...base, type: 'list', items: [''] }
    onChange([...value, block])
    setFocusedBlockId(block.id)
  }

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(value.map((b) => (b.id === id ? ({ ...b, ...updates } as ContentBlock) : b)))
  }

  const removeBlock = (id: string) => {
    onChange(value.filter((b) => b.id !== id))
  }

  const moveBlock = (id: string, dir: -1 | 1) => {
    const i = value.findIndex((b) => b.id === id)
    if (i < 0 || i + dir < 0 || i + dir >= value.length) return
    const next = [...value]
    ;[next[i], next[i + dir]] = [next[i + dir]!, next[i]!]
    onChange(next)
  }

  const uploadImage = async (blockId: string, file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError?.('Format accepté : JPEG, PNG ou WebP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      onError?.('Image trop volumineuse (5 Mo max).')
      return
    }
    updateBlock(blockId, { uploading: true })
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'webp'
      const path = `${entityId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('service-images')
        .upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('service-images').getPublicUrl(path)
      updateBlock(blockId, { url: data.publicUrl, uploading: false })
    } catch {
      onError?.("Erreur lors de l'upload.")
      updateBlock(blockId, { uploading: false })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && (
        <p className="py-10 text-center text-xs italic text-neutral-400">
          Ajoutez du contenu ci-dessous pour raconter votre offre en détail.
        </p>
      )}

      {value.map((block, i) => (
        <BlockWrapper
          key={block.id}
          index={i}
          total={value.length}
          onMove={(dir) => moveBlock(block.id, dir)}
          onRemove={() => removeBlock(block.id)}
        >
          {block.type === 'text' && (
            <TextBlock
              block={block}
              autoFocus={focusedBlockId === block.id}
              onChange={(content) => updateBlock(block.id, { content })}
            />
          )}
          {block.type === 'image' && (
            <ImageBlock block={block} onUpload={(file) => uploadImage(block.id, file)} />
          )}
          {block.type === 'list' && (
            <ListBlock block={block} onChange={(items) => updateBlock(block.id, { items })} />
          )}
        </BlockWrapper>
      ))}

      <div className="flex gap-3 pt-2">
        {[
          { type: 'text' as const, label: 'Texte', Icon: Type },
          { type: 'image' as const, label: 'Image', Icon: ImageIcon },
          { type: 'list' as const, label: 'Liste', Icon: List },
        ].map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="group flex flex-1 flex-col items-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 px-3 py-5 text-xs font-bold text-neutral-500 transition hover:border-accent hover:bg-accent-soft hover:text-accent"
          >
            <div className="flex rounded-full bg-neutral-0 p-2 shadow-sm transition group-hover:scale-110">
              <Icon className="h-4 w-4" />
            </div>
            Ajouter {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function BlockWrapper({
  children,
  index,
  total,
  onMove,
  onRemove,
}: {
  children: React.ReactNode
  index: number
  total: number
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="group relative">
      <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1">
        {index > 0 && (
          <button
            type="button"
            onClick={() => onMove(-1)}
            aria-label="Monter le bloc"
            className="flex rounded-sm border border-neutral-200 bg-neutral-0 p-1.5 text-neutral-400 shadow-sm transition hover:border-neutral-400 hover:text-neutral-900"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Supprimer le bloc"
          className="flex rounded-sm border border-neutral-200 bg-neutral-0 p-1.5 text-neutral-400 shadow-sm transition hover:border-error/30 hover:bg-error/5 hover:text-error"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        {index < total - 1 && (
          <button
            type="button"
            onClick={() => onMove(1)}
            aria-label="Descendre le bloc"
            className="flex rounded-sm border border-neutral-200 bg-neutral-0 p-1.5 text-neutral-400 shadow-sm transition hover:border-neutral-400 hover:text-neutral-900"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function TextBlock({
  block,
  onChange,
  autoFocus,
}: {
  block: Extract<ContentBlock, { type: 'text' }>
  onChange: (content: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
      <textarea
        value={block.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écrivez votre paragraphe…"
        autoFocus={autoFocus}
        rows={3}
        className="w-full resize-none bg-transparent pr-16 text-sm leading-relaxed text-neutral-600 outline-none"
      />
    </div>
  )
}

function ImageBlock({
  block,
  onUpload,
}: {
  block: Extract<ContentBlock, { type: 'image' }>
  onUpload: (file: File) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="overflow-hidden rounded-md border border-neutral-100">
      {block.url ? (
        <div className="relative">
          {/* Raw <img> instead of next/image: user-uploaded Supabase Storage URLs from the service-images bucket bypass next/image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt || ''} className="w-full object-cover" />
          {block.uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={block.uploading}
          className="group flex aspect-video w-full flex-col items-center justify-center gap-2 bg-neutral-50 text-neutral-400 transition hover:bg-accent-soft hover:text-accent"
        >
          <div className="flex rounded-full bg-neutral-0 p-3 shadow-sm transition group-hover:scale-110">
            {block.uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </div>
          <span className="text-xs font-bold">
            {block.uploading ? 'Upload…' : 'Cliquer pour téléverser'}
          </span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
      />
    </div>
  )
}

function ListBlock({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: 'list' }>
  onChange: (items: string[]) => void
}) {
  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3 pr-16">
      <ServiceHighlightsEditor
        value={block.items}
        onChange={onChange}
        label=""
        placeholder="Élément de liste"
        addLabel="Ajouter un élément"
      />
    </div>
  )
}
