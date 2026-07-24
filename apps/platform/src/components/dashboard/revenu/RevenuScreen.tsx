'use client'

import { useMemo, useState } from 'react'
import { ArrowDownToLine, ChevronDown } from 'lucide-react'
import type { ProjectRevenueSnapshot } from '@ibee/supabase'
import type { ReactNode } from 'react'

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const
const WEEK_DATES = [
  '17 Juin',
  '18 Juin',
  '19 Juin',
  '20 Juin',
  '21 Juin',
  '22 Juin',
  '23 Juin',
] as const
const YEAR_MONTHS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const

type TransferRow = {
  id?: string
  date: string
  label: string
  amount: string
  status?: string
  statusLabel?: string
  tag?: string
}

type Props = {
  title: string
  subtitle: string
  data: ProjectRevenueSnapshot
  pageClassName?: string
  transfersTitle?: string
  transfersTabs?: ReactNode
  transferRows?: TransferRow[]
  transferEmptyLabel?: string
  onExport?: () => void
  exportDisabled?: boolean
  actionError?: string | null
  footerActions?: ReactNode
  balanceAction?: ReactNode
  balanceTitle?: string
  balanceSubtitle?: string
  balanceExtra?: string | null
  balanceAmountCents?: number
}

function formatEuro(amount: number) {
  return (
    amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  )
}

export function RevenuScreen({
  title,
  subtitle,
  data,
  pageClassName = 'revenu-page',
  transfersTitle = 'Liste des virements',
  transfersTabs,
  transferRows,
  transferEmptyLabel = 'Aucun mouvement pour l’instant.',
  onExport,
  exportDisabled = false,
  actionError,
  footerActions,
  balanceAction,
  balanceTitle = 'Solde actuel',
  balanceSubtitle,
  balanceExtra,
  balanceAmountCents,
}: Props) {
  const [range, setRange] = useState<'week' | 'year'>('week')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const chart = useMemo(() => {
    if (range === 'week') {
      return {
        labels: [...WEEK_DAYS],
        values: data.weekValues,
        periodLabel: '17 Juin - 23 Juin 2025',
        payoutLabel: data.payoutLabelWeek,
      }
    }
    return {
      labels: [...YEAR_MONTHS],
      values: data.yearValues,
      periodLabel: 'Janvier - Décembre 2025',
      payoutLabel: data.payoutLabelYear,
    }
  }, [data, range])

  const rows: TransferRow[] =
    transferRows ??
    data.transfers.map((transfer, index) => ({
      id: `enc-${index}`,
      date: transfer.date,
      label: transfer.label,
      amount: transfer.amount,
    }))

  const displayedBalanceCents = balanceAmountCents ?? data.balanceCents

  const max = Math.max(...chart.values, 1)
  const total = chart.values.reduce((sum, value) => sum + value, 0)
  const headAmount = selectedIndex == null ? total : (chart.values[selectedIndex] ?? 0)
  const headLabel =
    selectedIndex == null
      ? chart.periodLabel
      : range === 'week'
        ? `${WEEK_DATES[selectedIndex]} 2025`
        : `${YEAR_MONTHS[selectedIndex]} 2025`

  return (
    <div className={pageClassName}>
      <div className="revenu-page__head">
        <div>
          <h1 className="revenu-page__title">{title}</h1>
          <p className="revenu-page__subtitle">{subtitle}</p>
        </div>
        <button
          type="button"
          className="revenu-export-btn"
          onClick={onExport}
          disabled={!onExport || exportDisabled}
        >
          Exporter
          <ChevronDown className="h-3 w-3 text-neutral-500" aria-hidden="true" />
        </button>
      </div>

      {actionError ? <p className="revenu-page__error">{actionError}</p> : null}

      <div className="revenu-card revenu-card--chart">
        <div className="revenu-chart-top">
          <div className="revenu-chart-meta">
            <div className="revenu-chart-meta__label">{headLabel}</div>
            <div className="revenu-chart-meta__amount">{formatEuro(headAmount)}</div>
          </div>
          <div className="revenu-chart-controls">
            <div className="revenu-range-toggle" role="group" aria-label="Période">
              {(
                [
                  ['week', 'Semaine'],
                  ['year', 'Année'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`revenu-range-toggle__btn${range === key ? ' is-active' : ''}`}
                  onClick={() => {
                    setRange(key)
                    setSelectedIndex(null)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="revenu-period-btn">
              Actuel
              <ChevronDown className="h-3 w-3 text-neutral-400" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="revenu-bars-wrap">
          {chart.values.map((value, index) => {
            const active = selectedIndex === index
            return (
              <button
                key={`${range}-${index}`}
                type="button"
                className={`revenu-bar-col${active ? ' is-active' : ''}`}
                onClick={() => setSelectedIndex(active ? null : index)}
                aria-label={`${chart.labels[index]} : ${formatEuro(value)}`}
              >
                <div className="revenu-bar-track">
                  <div
                    className="revenu-bar-fill"
                    style={{
                      height: `${Math.max((value / max) * 100, value === 0 ? 0 : 6)}%`,
                    }}
                  />
                  {active ? <span className="revenu-bar-tip">{formatEuro(value)}</span> : null}
                </div>
                <span className="revenu-bar-day">{chart.labels[index]}</span>
              </button>
            )
          })}
        </div>
        <p className="revenu-chart-hint">Vous pouvez sélectionner une barre du graphique</p>
      </div>

      <div className="revenu-card revenu-balance">
        <div>
          <div className="revenu-balance__title">{balanceTitle}</div>
          <div className="revenu-balance__sub">{balanceSubtitle ?? chart.payoutLabel}</div>
          {balanceExtra ? <div className="revenu-balance__extra">{balanceExtra}</div> : null}
        </div>
        <div className="revenu-balance__row">
          <span className="revenu-balance__amount">{formatEuro(displayedBalanceCents / 100)}</span>
          {balanceAction ?? (
            <button type="button" className="revenu-cashout-btn">
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
              Encaisser
            </button>
          )}
        </div>
      </div>

      <div className="revenu-card revenu-transfers">
        <div className="revenu-transfers__head">
          <div className="flex items-center justify-between w-full">
            <div className="revenu-transfers__title">{transfersTitle}</div>
            {transfersTabs}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="revenu-transfers__empty">{transferEmptyLabel}</p>
        ) : (
          rows.map((transfer) => (
            <div
              key={transfer.id ?? `${transfer.date}-${transfer.label}`}
              className="revenu-transfer-row"
            >
              <span className="revenu-transfer-row__date">{transfer.date}</span>
              <span className="revenu-transfer-row__label">
                {transfer.label}
                {transfer.statusLabel ? (
                  <span className="revenu-transfer-row__status">{transfer.statusLabel}</span>
                ) : null}
                {transfer.tag && (
                  <div className="flex shrink-0 items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ml-2">
                    {transfer.tag}
                  </div>
                )}
              </span>
              <div className="flex shrink-0 items-center justify-end rounded bg-orange-50 px-3 py-1 font-mono text-sm font-medium text-orange-600">
                {transfer.amount}
              </div>
            </div>
          ))
        )}
        {footerActions ? <div className="revenu-transfers__footer">{footerActions}</div> : null}
      </div>
    </div>
  )
}
