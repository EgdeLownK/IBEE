'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import {
  completePayoutTransfersAction,
  createOneTimePayoutAction,
  disablePayoutScheduleAction,
  exportPayoutTransfersAction,
  savePayoutScheduleAction,
} from '@/app/dashboard/payout-actions'
import { useAccountContext } from '@/components/dashboard/AccountContext'
import type { RevenuProjetData } from '@/lib/load-revenu-projet-data'
import {
  formatPayoutTransferAmount,
  payoutTransferStatusLabel,
  type PayoutTransferRecord,
} from '@ibee/supabase'
import { PayoutRulesDialog, type PayoutDialogMode } from './PayoutRulesDialog'
import { RevenuScreen } from './RevenuScreen'

type Props = {
  data: RevenuProjetData
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function RevenuProjetDashboard({ data }: Props) {
  const router = useRouter()
  const { activeProject } = useAccountContext()
  const [isPending, startTransition] = useTransition()
  const [configOpen, setConfigOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<PayoutDialogMode>('recurring')
  const [actionError, setActionError] = useState<string | null>(null)
  const [transfers, setTransfers] = useState(data.payouts.transfers)
  const [expenses, setExpenses] = useState(data.payouts.expenses ?? [])
  const [schedule, setSchedule] = useState(data.payouts.schedule)
  const [filterTag, setFilterTag] = useState<'all' | 'équipe' | 'achats'>('all')

  useEffect(() => {
    setTransfers(data.payouts.transfers)
    setExpenses(data.payouts.expenses ?? [])
    setSchedule(data.payouts.schedule)
  }, [data])

  const transferRows = useMemo(() => {
    const rows = [
      ...transfers.map((transfer) => ({
        id: transfer.id,
        dateStr: transfer.scheduledAt,
        date: new Date(transfer.scheduledAt).toLocaleDateString('fr-FR'),
        label: transfer.recipientName,
        amount: formatPayoutTransferAmount(transfer.amountCents),
        status: transfer.status,
        statusLabel: transfer.isOneTime
          ? `Unique · ${payoutTransferStatusLabel(transfer.status)}`
          : payoutTransferStatusLabel(transfer.status),
        tag: 'Équipe',
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        dateStr: expense.incurredAt,
        date: new Date(expense.incurredAt).toLocaleDateString('fr-FR'),
        label: expense.description,
        amount: formatPayoutTransferAmount(expense.amountCents),
        status: expense.status,
        tag: 'Achat',
      })),
    ].sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime())

    if (filterTag === 'équipe') return rows.filter((r) => r.tag === 'Équipe')
    if (filterTag === 'achats') return rows.filter((r) => r.tag === 'Achat')
    return rows
  }, [transfers, expenses, filterTag])

  const pendingTransferIds = useMemo(
    () =>
      transfers.filter((transfer) => transfer.status === 'pending').map((transfer) => transfer.id),
    [transfers],
  )

  const exportedTransferIds = useMemo(
    () =>
      transfers.filter((transfer) => transfer.status === 'exported').map((transfer) => transfer.id),
    [transfers],
  )

  function refreshTransferStatus(ids: string[], status: PayoutTransferRecord['status']) {
    const now = new Date().toISOString()
    setTransfers((prev) =>
      prev.map((transfer) =>
        ids.includes(transfer.id)
          ? {
              ...transfer,
              status,
              exportedAt: status === 'exported' ? now : transfer.exportedAt,
              completedAt: status === 'completed' ? now : transfer.completedAt,
            }
          : transfer,
      ),
    )
  }

  function handleExport() {
    setActionError(null)
    startTransition(() => {
      void exportPayoutTransfersAction().then((result) => {
        if (!result.ok) {
          setActionError(result.error)
          return
        }
        downloadCsv(result.data.filename, result.data.csv)
        refreshTransferStatus(result.data.transferIds, 'exported')
      })
    })
  }

  function handleCompleteExported() {
    if (exportedTransferIds.length === 0) return
    setActionError(null)
    startTransition(() => {
      void completePayoutTransfersAction(exportedTransferIds).then((result) => {
        if (!result.ok) {
          setActionError(result.error)
          return
        }
        refreshTransferStatus(exportedTransferIds, 'completed')
      })
    })
  }

  return (
    <>
      <RevenuScreen
        title="Revenus projet"
        subtitle={`${activeProject.name} — chiffre d'affaires du projet, partagé avec l'équipe selon les droits`}
        data={data.revenue}
        pageClassName="revenu-page activite-page"
        balanceTitle="Solde disponible"
        balanceSubtitle="Montant encore disponible maintenant"
        balanceAmountCents={data.payouts.availableBalanceCents}
        balanceExtra={data.payouts.nextPayoutLabel}
        transfersTitle="Liste des virements"
        transfersTabs={
          <div className="flex bg-gray-100 p-0.5 rounded-lg">
            {(['all', 'équipe', 'achats'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTag(tab)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filterTag === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab === 'all' ? 'Tous' : tab === 'équipe' ? 'Équipe' : 'Achats'}
              </button>
            ))}
          </div>
        }
        transferRows={transferRows}
        transferEmptyLabel="Aucun mouvement pour l'instant."
        onExport={handleExport}
        exportDisabled={isPending || pendingTransferIds.length === 0}
        actionError={actionError}
        footerActions={
          exportedTransferIds.length > 0 ? (
            <button
              type="button"
              className="revenu-payout-btn revenu-payout-btn--ghost"
              onClick={handleCompleteExported}
              disabled={isPending}
            >
              Marquer les exportés comme effectués
            </button>
          ) : null
        }
        balanceAction={
          <button
            type="button"
            className="revenu-cashout-btn"
            onClick={() => {
              setDialogMode('recurring')
              setConfigOpen(true)
            }}
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            {schedule ? 'Modifier' : 'Virement maintenant'}
          </button>
        }
      />

      <PayoutRulesDialog
        open={configOpen}
        mode={dialogMode}
        recipients={data.payouts.recipients}
        schedule={schedule}
        saving={isPending}
        onClose={() => setConfigOpen(false)}
        onModeChange={setDialogMode}
        onSave={async (input) => {
          const result = await savePayoutScheduleAction(input)
          if (!result.ok) return result.error
          router.refresh()
          return null
        }}
        onCreateOneTime={async (input) => {
          const result = await createOneTimePayoutAction(input)
          if (!result.ok) return result.error
          router.refresh()
          return null
        }}
        onDisable={async () => {
          const result = await disablePayoutScheduleAction()
          if (!result.ok) return result.error
          setSchedule(null)
          router.refresh()
          return null
        }}
      />
    </>
  )
}
