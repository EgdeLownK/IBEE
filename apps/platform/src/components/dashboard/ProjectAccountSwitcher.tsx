'use client'

import { useId, useState, type CSSProperties, type ToggleEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAccountContext } from './AccountContext'
import { closeAppDrawer } from './MainRail'

type Props = {
  variant?: 'header' | 'sidebar'
  onAccountChange?: () => void
}

export function ProjectAccountSwitcher({ variant = 'header', onAccountChange }: Props) {
  const menuId = useId().replace(/:/g, '')
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    personalAccount,
    projectAccounts,
    projectLabel,
    mode,
    activeProjectId,
    setPersonalMode,
    setProjectMode,
  } = useAccountContext()

  function handleAccountChange(action: () => void) {
    action()
    document.getElementById(menuId)?.hidePopover()
    onAccountChange?.()
    if (variant === 'sidebar' && window.innerWidth < 1200) {
      closeAppDrawer()
    }
  }

  const triggerClassName =
    variant === 'sidebar'
      ? `sidebar__account-switcher${menuOpen ? ' is-open' : ''}`
      : `app-header__project${menuOpen ? ' is-open' : ''}`

  function handleMenuToggle(event: ToggleEvent<HTMLDivElement>) {
    setMenuOpen(event.newState === 'open')
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        style={{ anchorName: `--${menuId}` } as CSSProperties}
        className={triggerClassName}
        aria-label="Changer de compte"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span
          className={
            variant === 'sidebar'
              ? 'sidebar__account-switcher__label truncate'
              : 'truncate max-w-[200px] min-[1200px]:max-w-[280px]'
          }
        >
          {projectLabel}
        </span>
        <ChevronDown
          className={`project-account-switcher__chevron h-4 w-4 shrink-0${
            variant === 'sidebar' ? '' : ' text-neutral-500'
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        id={menuId}
        popover="auto"
        className={`app-menu app-menu--project${variant === 'sidebar' ? ' app-menu--from-sidebar' : ''}`}
        style={{ positionAnchor: `--${menuId}` } as CSSProperties}
        onToggle={handleMenuToggle}
      >
        <p className="app-menu__section-label">Comptes</p>
        <button
          type="button"
          className={`app-menu__account-item${mode === 'personal' ? ' is-active' : ''}`}
          onClick={() => handleAccountChange(setPersonalMode)}
        >
          <span className="app-menu__account-dot app-menu__account-dot--personal" />
          <span className="min-w-0 flex-1 text-left">
            <span className="app-menu__account-name">Compte perso</span>
            <span className="app-menu__account-meta">{personalAccount.displayName}</span>
          </span>
        </button>
        {projectAccounts.map((project) => (
          <button
            key={project.id}
            type="button"
            className={`app-menu__account-item${
              mode === 'project' && activeProjectId === project.id ? ' is-active' : ''
            }`}
            onClick={() => handleAccountChange(() => setProjectMode(project.id))}
          >
            <span className="app-menu__account-dot" style={{ background: project.color }} />
            <span className="min-w-0 flex-1 text-left">
              <span className="app-menu__account-name">{project.name}</span>
              {project.role ? <span className="app-menu__account-meta">{project.role}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </>
  )
}
