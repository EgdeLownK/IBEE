'use client'

import { useId, useState, type CSSProperties, type ToggleEvent } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useAccountContext } from './AccountContext'
import { closeAppDrawer } from './MainRail'
import { CreateEntityDialog } from '@/components/account/CreateEntityDialog'

type Props = {
  /** 'rail' = capsule avatar+nom en tête du rail zone profile-web (maquette
   *  Prototype desktop.dc.html L52 — le sélecteur de compte existant est
   *  conservé, la maquette montre l'élément statique sans interaction). */
  variant?: 'header' | 'rail'
  onAccountChange?: () => void
}

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function ProjectAccountSwitcher({ variant = 'header', onAccountChange }: Props) {
  const menuId = useId().replace(/:/g, '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const {
    personalAccount,
    projectAccounts,
    projectLabel,
    activeProject,
    mode,
    activeProjectId,
    setPersonalMode,
    setProjectMode,
  } = useAccountContext()

  function handleAccountChange(action: () => void) {
    action()
    document.getElementById(menuId)?.hidePopover()
    onAccountChange?.()
    if (variant === 'rail' && window.innerWidth < 1200) {
      closeAppDrawer()
    }
  }

  function handleMenuToggle(event: ToggleEvent<HTMLDivElement>) {
    setMenuOpen(event.newState === 'open')
  }

  if (variant === 'rail') {
    return (
      <>
        <button
          type="button"
          popoverTarget={menuId}
          style={{ anchorName: `--${menuId}` } as CSSProperties}
          className={`rail-btn${menuOpen ? ' is-open' : ''}`}
          aria-label="Changer de compte"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="rail-btn__avatar rail-btn__avatar--lg" aria-hidden="true">
            {activeProject.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeProject.avatarUrl} alt="" />
            ) : (
              <span>{initialOf(activeProject.name)}</span>
            )}
          </span>
          <span className="rail-btn__label">{projectLabel}</span>
          <ChevronDown
            className="project-account-switcher__chevron h-3 w-3 shrink-0"
            aria-hidden="true"
          />
        </button>

        <div
          id={menuId}
          popover="auto"
          className="app-menu app-menu--project app-menu--from-sidebar"
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
                {project.role ? (
                  <span className="app-menu__account-meta">{project.role}</span>
                ) : null}
              </span>
            </button>
          ))}
          <hr className="my-1 border-neutral-100" />
          <button
            type="button"
            className="app-menu__item"
            onClick={() => {
              document.getElementById(menuId)?.hidePopover()
              setCreateOpen(true)
            }}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Créer une entreprise</span>
          </button>
        </div>

        <CreateEntityDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </>
    )
  }

  const triggerClassName = `app-header__project${menuOpen ? ' is-open' : ''}`

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
        <span className="truncate max-w-[200px] min-[1200px]:max-w-[280px]">{projectLabel}</span>
        <ChevronDown
          className="project-account-switcher__chevron h-4 w-4 shrink-0 text-neutral-500"
          aria-hidden="true"
        />
      </button>

      <div
        id={menuId}
        popover="auto"
        className="app-menu app-menu--project"
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
        <hr className="my-1 border-neutral-100" />
        <button
          type="button"
          className="app-menu__item"
          onClick={() => {
            document.getElementById(menuId)?.hidePopover()
            setCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Créer une entreprise</span>
        </button>
      </div>

      <CreateEntityDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
