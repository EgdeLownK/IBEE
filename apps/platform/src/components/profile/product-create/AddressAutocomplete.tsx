'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({ id, value, onChange, placeholder, className }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<{ label: string; context: string }[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value !== query) {
      setQuery(value)
    }
  }, [value])

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
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
        )
        if (res.ok) {
          const data = await res.json()
          if (data && data.features) {
            setSuggestions(
              data.features.map((f: any) => ({
                label: f.properties.label,
                context: f.properties.context,
              })),
            )
            setIsOpen(true)
          }
        }
      } catch (e) {
        console.error('Erreur Address API', e)
      } finally {
        setIsLoading(false)
      }
    }, 400) // Debounce

    return () => clearTimeout(timeoutId)
  }, [query, value])

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        className={className}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true)
        }}
        autoComplete="off"
      />
      {isLoading && (
        <span className="absolute right-3 top-2.5 h-4 w-4 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin" />
      )}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {suggestions.map((item, index) => (
            <li
              key={index}
              className="relative cursor-default select-none py-2 pl-3 pr-9 text-neutral-900 hover:bg-neutral-100 cursor-pointer"
              onClick={() => {
                setQuery(item.label)
                onChange(item.label)
                setIsOpen(false)
              }}
            >
              <span className="block truncate font-medium">{item.label}</span>
              {item.context && (
                <span className="block truncate text-xs text-neutral-500">{item.context}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
