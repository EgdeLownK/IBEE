'use client'

import { useLayoutEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  label?: string
  placeholder?: string
  addLabel?: string
}

export function ServiceHighlightsEditor({
  value,
  onChange,
  label = 'À propos',
  placeholder = 'Décrivez un point clé. Le texte passe automatiquement à la ligne si nécessaire.',
  addLabel = 'Ajouter un point',
}: Props) {
  const update = (i: number, next: string) => {
    onChange(value.map((v, idx) => (idx === i ? next : v)))
  }

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i))
  }

  const add = () => {
    onChange([...value, ''])
  }

  return (
    <div>
      {label && (
        <label className="mb-2.5 block text-sm font-bold text-neutral-600">{label}</label>
      )}

      <div className="flex flex-col gap-2">
        {value.map((point, i) => (
          <HighlightRow
            key={i}
            value={point}
            placeholder={placeholder}
            onChange={(next) => update(i, next)}
            onRemove={value.length > 1 || point !== '' ? () => remove(i) : undefined}
            autoFocus={point === '' && i === value.length - 1}
          />
        ))}

        <button
          type="button"
          onClick={add}
          className="mt-1 flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-bold text-accent transition hover:bg-accent-soft hover:text-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>
    </div>
  )
}

function HighlightRow({
  value,
  placeholder,
  onChange,
  onRemove,
  autoFocus,
}: {
  value: string
  placeholder: string
  onChange: (next: string) => void
  onRemove?: () => void
  autoFocus?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div className="group flex items-start gap-2">
      <span
        className="mt-[13px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
        aria-hidden
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        autoFocus={autoFocus}
        className="min-h-[38px] flex-1 resize-none overflow-hidden rounded-md bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-600 outline-none transition focus:bg-neutral-0 focus:ring-2 focus:ring-accent/15"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Supprimer ce point"
          className="mt-1 rounded-sm p-1.5 text-neutral-400 opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:bg-neutral-50 hover:text-neutral-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
