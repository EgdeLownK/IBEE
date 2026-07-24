'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Newspaper,
  ShoppingBag,
  Upload,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AnalyseScope } from '@/lib/analyse-data'
import {
  ALL_EXPORT_SCOPES,
  ALL_EXPORT_SECTIONS,
  buildAnalyseExportQuery,
  EXPORT_SCOPE_OPTIONS,
} from '@/lib/analyse-export'
import {
  ANALYSE_PERIOD_TABS,
  formatPeriodRangeLabel,
  getMinPeriodOffset,
  getPeriodWindow,
  type AnalysePeriod,
} from '@/lib/analyse-period'

type Props = {
  accountCreatedAt: string
  defaultPeriod: AnalysePeriod
  defaultOffset: number
}

const SCOPE_ICONS: Record<AnalyseScope, LucideIcon> = {
  web: LayoutGrid,
  news: Newspaper,
  shop: ShoppingBag,
  service: Briefcase,
  event: CalendarDays,
}

function toggleAll<T extends string>(all: readonly T[], current: Set<T>, checked: boolean) {
  return checked ? new Set(all) : new Set<T>()
}

function toggleItem<T extends string>(current: Set<T>, id: T, checked: boolean) {
  const next = new Set(current)
  if (checked) next.add(id)
  else next.delete(id)
  return next
}

function ExportOption({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string
  icon?: LucideIcon
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`anal-export-option${selected ? ' is-on' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {Icon ? (
        <span className="anal-export-option__icon-wrap">
          <Icon className="anal-export-option__icon" aria-hidden="true" />
        </span>
      ) : null}
      <span className="anal-export-option__label">{label}</span>
      <span className="anal-export-option__mark" aria-hidden="true">
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
      </span>
    </button>
  )
}

function SectionHead({
  label,
  allSelected,
  onToggleAll,
}: {
  label: string
  allSelected: boolean
  onToggleAll: () => void
}) {
  return (
    <div className="anal-export-menu__section-head">
      <h3 className="anal-export-menu__label">{label}</h3>
      <button type="button" className="anal-export-menu__toggle-all" onClick={onToggleAll}>
        {allSelected ? 'Effacer' : 'Tout'}
      </button>
    </div>
  )
}

export function AnalyseExportMenu({ accountCreatedAt, defaultPeriod, defaultOffset }: Props) {
  const popoverId = useId().replace(/:/g, '')
  const [selectedScopes, setSelectedScopes] = useState(
    () => new Set<AnalyseScope>(ALL_EXPORT_SCOPES),
  )
  const [exportPeriod, setExportPeriod] = useState<AnalysePeriod>(defaultPeriod)
  const [exportOffset, setExportOffset] = useState(defaultOffset)

  const minOffset = useMemo(
    () => getMinPeriodOffset(exportPeriod, accountCreatedAt),
    [exportPeriod, accountCreatedAt],
  )
  const rangeLabel = useMemo(() => {
    const window = getPeriodWindow(exportPeriod, exportOffset)
    return formatPeriodRangeLabel(exportPeriod, window)
  }, [exportPeriod, exportOffset])

  const allScopesSelected = selectedScopes.size === ALL_EXPORT_SCOPES.length
  const canExport = selectedScopes.size > 0
  const canGoBack = exportOffset > minOffset
  const canGoForward = exportOffset < 0

  const summary = useMemo(() => {
    const scopeCount = selectedScopes.size
    const scopeLabel =
      scopeCount === ALL_EXPORT_SCOPES.length
        ? 'tous les périmètres'
        : `${scopeCount} périmètre${scopeCount > 1 ? 's' : ''}`
    return `${rangeLabel} · ${scopeLabel}`
  }, [selectedScopes.size, rangeLabel])

  useEffect(() => {
    if (exportOffset < minOffset) {
      setExportOffset(minOffset)
    }
  }, [exportOffset, minOffset])

  const exportHref = canExport
    ? `/dashboard/analyse/export?${buildAnalyseExportQuery({
        scopes: [...selectedScopes],
        sections: [...ALL_EXPORT_SECTIONS],
        period: exportPeriod,
        offset: exportOffset,
      })}`
    : undefined

  function handleDownload() {
    if (!exportHref) return
    closeMenu()
  }

  function closeMenu() {
    document.getElementById(popoverId)?.hidePopover()
  }

  return (
    <div className="anal-export-wrap">
      <button
        type="button"
        className="anal-export"
        popoverTarget={popoverId}
        style={{ anchorName: `--${popoverId}` } as React.CSSProperties}
        aria-haspopup="dialog"
        aria-expanded={false}
        aria-controls={popoverId}
      >
        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Exporter</span>
        <ChevronDown className="h-2.5 w-2.5 anal-export__chev" aria-hidden="true" />
      </button>

      <div
        id={popoverId}
        popover="auto"
        className="anal-export-menu"
        style={{ positionAnchor: `--${popoverId}` } as React.CSSProperties}
        role="dialog"
        aria-label="Options d'export"
      >
        <header className="anal-export-menu__head">
          <button
            type="button"
            className="anal-export-menu__close"
            aria-label="Fermer"
            onClick={closeMenu}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="anal-export-menu__head-text">
            <h2 className="anal-export-menu__title">Exporter</h2>
            <p className="anal-export-menu__subtitle">
              Téléchargez vos statistiques au format CSV.
            </p>
          </div>
        </header>

        <div className="anal-export-menu__body">
          <section className="anal-export-menu__section">
            <h3 className="anal-export-menu__label">Période</h3>
            <div className="anal-export-menu__period" role="tablist" aria-label="Période d'export">
              {ANALYSE_PERIOD_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={exportPeriod === tab.id}
                  className={`anal-export-menu__period-btn${exportPeriod === tab.id ? ' is-on' : ''}`}
                  onClick={() => {
                    setExportPeriod(tab.id)
                    setExportOffset(0)
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="anal-export-menu__range-card">
              <button
                type="button"
                className="anal-export-menu__range-nav"
                aria-label="Période précédente"
                disabled={!canGoBack}
                onClick={() => setExportOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="anal-export-menu__range-label">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{rangeLabel}</span>
              </div>
              <button
                type="button"
                className="anal-export-menu__range-nav"
                aria-label="Période suivante"
                disabled={!canGoForward}
                onClick={() => setExportOffset((o) => o + 1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="anal-export-menu__section">
            <SectionHead
              label="Périmètres"
              allSelected={allScopesSelected}
              onToggleAll={() =>
                setSelectedScopes(toggleAll(ALL_EXPORT_SCOPES, selectedScopes, !allScopesSelected))
              }
            />
            <div className="anal-export-options">
              {EXPORT_SCOPE_OPTIONS.map((option) => (
                <ExportOption
                  key={option.id}
                  label={option.label}
                  icon={SCOPE_ICONS[option.id]}
                  selected={selectedScopes.has(option.id)}
                  onClick={() =>
                    setSelectedScopes(
                      toggleItem(selectedScopes, option.id, !selectedScopes.has(option.id)),
                    )
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <footer className="anal-export-menu__foot">
          <p className="anal-export-menu__summary">
            {canExport ? summary : 'Sélectionnez au moins un périmètre.'}
          </p>
          {canExport ? (
            <a href={exportHref} className="anal-export-menu__submit" onClick={handleDownload}>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Télécharger le CSV</span>
            </a>
          ) : (
            <button type="button" className="anal-export-menu__submit" disabled>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Télécharger le CSV</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
