'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Plus, X } from 'lucide-react'
import type { JobSkill } from '@ibee/supabase'
import { MAX_JOB_OFFER_SKILLS, validateJobSkillLabel } from '@ibee/shared'
import { createJobSkillAction, searchJobSkillsAction } from '@/app/dashboard/talent/talent-actions'

export type JobSkillTag = Pick<JobSkill, 'id' | 'label'>

type Props = {
  value: JobSkillTag[]
  onChange: (next: JobSkillTag[]) => void
}

/**
 * Saisie libre + autocompletion pour les aptitudes d'une offre (Lot 4
 * Mission 2). Chaque tag est resolu (find-or-create, createJobSkillAction)
 * DES QU'IL EST AJOUTE - pas a la soumission du formulaire - meme flux que
 * l'upload media (uploadOneMedia, JobOfferDialog.tsx) : le payload final ne
 * transporte que des skill_ids deja connus.
 *
 * Recherche par sous-chaine uniquement (normalized_label, insensible casse/
 * accents/espaces, searchJobSkillsAction). La similarite floue pg_trgm
 * ("Vouliez-vous dire ?") N'EST PAS cablee ici - decision Killian (Lot 4
 * Mission 2, rapport phase 0) : elle exigerait une fonction SQL nouvelle
 * (migration), hors perimetre d'une mission applicative. Voir le meme
 * commentaire dans searchJobSkills (packages/supabase/src/project-talent.ts).
 */
export function JobSkillsPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<JobSkillTag[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const atMax = value.length >= MAX_JOB_OFFER_SKILLS

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchJobSkillsAction(trimmed)
        setSuggestions(results.filter((r) => !value.some((v) => v.id === r.id)))
        setIsOpen(true)
      } catch {
        // Recherche best-effort : une erreur reseau ne bloque pas la
        // creation directe (Entree / bouton "Creer"), voir handleCreate.
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timeoutId)
  }, [query, value])

  function handleAddExisting(skill: JobSkillTag) {
    if (atMax || value.some((v) => v.id === skill.id)) return
    onChange([...value, skill])
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
  }

  async function handleCreate() {
    const label = query.trim()
    if (!label || atMax || isCreating) return
    const validationError = validateJobSkillLabel(label)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setIsCreating(true)
    try {
      const skill = await createJobSkillAction(label)
      if (!value.some((v) => v.id === skill.id)) {
        onChange([...value, { id: skill.id, label: skill.label }])
      }
      setQuery('')
      setSuggestions([])
      setIsOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setError(message || 'Impossible de créer cette aptitude.')
    } finally {
      setIsCreating(false)
    }
  }

  function removeSkill(id: string) {
    onChange(value.filter((v) => v.id !== id))
  }

  function moveSkill(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const copy = [...value]
    ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
    onChange(copy)
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={wrapperRef}>
        <input
          type="text"
          value={query}
          disabled={atMax}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleCreate()
            }
          }}
          placeholder={
            atMax
              ? `Maximum ${MAX_JOB_OFFER_SKILLS} aptitudes atteint`
              : 'Ex. : Permis B, Machines à bois...'
          }
          className="block w-full rounded-field border border-border bg-surface px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300 disabled:cursor-not-allowed disabled:bg-panel disabled:text-neutral-400"
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
        )}

        {isOpen && query.trim() && !atMax && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-field border border-border bg-surface py-1 shadow-pop">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="block w-full truncate px-4 py-2 text-left text-sm text-neutral-900 hover:bg-panel"
                  onClick={() => handleAddExisting(s)}
                >
                  {s.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-neutral-900 hover:bg-panel disabled:opacity-50"
                onClick={() => void handleCreate()}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Créer « {query.trim()} »
              </button>
            </li>
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((skill, i) => (
            <li
              key={skill.id}
              className="inline-flex items-center gap-1.5 rounded-chip border border-border bg-panel px-3 py-1.5 text-sm text-neutral-900"
            >
              <button
                type="button"
                className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                aria-label="Monter"
                disabled={i === 0}
                onClick={() => moveSkill(i, -1)}
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                aria-label="Descendre"
                disabled={i === value.length - 1}
                onClick={() => moveSkill(i, 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <span>{skill.label}</span>
              <button
                type="button"
                className="text-neutral-400 hover:text-error"
                aria-label={`Retirer ${skill.label}`}
                onClick={() => removeSkill(skill.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
