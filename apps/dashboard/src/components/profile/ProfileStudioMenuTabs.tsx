'use client'

import { useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { ProfileTabType } from '@ibee/supabase'
import {
  PROFILE_TAB_ICONS,
  PROFILE_TAB_LABELS,
  PROFILE_TAB_ORDER,
} from '@ibee/ui-react/profile'
import { addMenuSectionAction, removeMenuSectionAction } from '@/app/dashboard/site/actions'

interface SectionOption {
  type: ProfileTabType
  active: boolean
}

interface MenuSection {
  type: string
}

interface Props {
  menuSections: MenuSection[]
  sectionOptions: SectionOption[]
  activeType: string
  onTabChange: (type: string) => void
}

export function ProfileStudioMenuTabs({
  menuSections,
  sectionOptions,
  activeType,
  onTabChange,
}: Props) {
  const [options, setOptions] = useState(sectionOptions)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [pending, startTransition] = useTransition()
  const addBtnRef = useRef<HTMLButtonElement>(null)

  const activeTypes = useMemo(() => {
    const set = new Set<string>(['home'])
    menuSections.forEach((s) => set.add(s.type))
    options.filter((o) => o.active).forEach((o) => set.add(o.type))
    return set
  }, [menuSections, options])

  const visibleTabs = PROFILE_TAB_ORDER.filter((t) => activeTypes.has(t))

  const inactive = options.filter((o) => !o.active)
  const activeRemovable = options.filter((o) => o.active)

  useLayoutEffect(() => {
    if (!menuOpen || !addBtnRef.current) {
      setMenuPos(null)
      return
    }
    function updatePos() {
      const rect = addBtnRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({ top: rect.bottom + 8, left: rect.left })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [menuOpen])

  function patchOption(type: ProfileTabType, active: boolean) {
    setOptions((prev) => prev.map((o) => (o.type === type ? { ...o, active } : o)))
  }

  function handleAdd(type: ProfileTabType) {
    setMenuOpen(false)
    patchOption(type, true)
    onTabChange(type)
    startTransition(async () => {
      const result = await addMenuSectionAction(type)
      if (!result.ok) {
        patchOption(type, false)
        toast.error(result.error)
      }
    })
  }

  function handleRemove(type: ProfileTabType) {
    const label = PROFILE_TAB_LABELS[type] ?? type
    if (!confirm(`Masquer l'onglet « ${label} » ? Le contenu est conservé.`)) return
    setMenuOpen(false)
    patchOption(type, false)
    if (activeType === type) onTabChange('home')
    startTransition(async () => {
      const result = await removeMenuSectionAction(type)
      if (!result.ok) {
        patchOption(type, true)
        toast.error(result.error)
      }
    })
  }

  const menuPortal =
    menuOpen &&
    menuPos &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[60] cursor-default"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="menu"
          className="fixed z-[70] w-56 rounded-xl border border-neutral-200 bg-neutral-0 p-2 shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {inactive.length > 0 && (
            <>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Ajouter un onglet
              </p>
              {inactive.map((s) => {
                const Icon = PROFILE_TAB_ICONS[s.type]
                return (
                  <button
                    key={s.type}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                    onClick={() => handleAdd(s.type)}
                  >
                    <Icon className="h-4 w-4 text-neutral-500" />
                    {PROFILE_TAB_LABELS[s.type]}
                  </button>
                )
              })}
            </>
          )}
          {inactive.length > 0 && activeRemovable.length > 0 && (
            <div className="my-1 h-px bg-neutral-200" />
          )}
          {activeRemovable.length > 0 && (
            <>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Masquer un onglet
              </p>
              {activeRemovable.map((s) => {
                const Icon = PROFILE_TAB_ICONS[s.type]
                return (
                  <button
                    key={`rm-${s.type}`}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
                    onClick={() => handleRemove(s.type)}
                  >
                    <Icon className="h-4 w-4 text-neutral-400" />
                    {PROFILE_TAB_LABELS[s.type]}
                  </button>
                )
              })}
            </>
          )}
          {inactive.length === 0 && activeRemovable.length === 0 && (
            <p className="px-2 py-2 text-sm text-neutral-500">Tous les onglets sont actifs.</p>
          )}
        </div>
      </>,
      document.body
    )

  return (
    <nav aria-label="Navigation du profil" className="profile-tabs-wrap">
      <div className="segtabs no-scrollbar">
        <div className="relative shrink-0">
          <button
            ref={addBtnRef}
            type="button"
            disabled={pending}
            onClick={() => setMenuOpen((v) => !v)}
            className="segtab"
            style={{ color: 'var(--color-neutral-400)' }}
            aria-label="Gérer les menus du profil"
            aria-expanded={menuOpen}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {visibleTabs.map((type) => {
          const Icon = PROFILE_TAB_ICONS[type]
          const isActive = type === activeType
          return (
            <button
              key={type}
              type="button"
              className={`segtab${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(type)}
            >
              <Icon aria-hidden="true" />
              {PROFILE_TAB_LABELS[type]}
            </button>
          )
        })}
      </div>
      {menuPortal}
    </nav>
  )
}
