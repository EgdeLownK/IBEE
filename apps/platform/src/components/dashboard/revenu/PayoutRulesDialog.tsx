'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Pencil } from 'lucide-react'
import type {
  PayoutAllocationInput,
  PayoutRecipient,
  PayoutRecurrence,
  PayoutScheduleRecord,
} from '@ibee/supabase'
import { defaultPayoutStartDateInput, formatPayoutStartDateInput } from '@ibee/supabase'

export type PayoutDialogMode = 'recurring' | 'one_time'

export type PayoutAllocationDraft = {
  recipientType: 'owner' | 'member'
  memberId: string | null
  amountType: 'fixed' | 'percent'
  amountValue: string
  startDate: string
  endDate: string | null
  recurrence: PayoutRecurrence
}

type Props = {
  open: boolean
  mode: PayoutDialogMode
  recipients: PayoutRecipient[]
  schedule: PayoutScheduleRecord | null
  saving?: boolean
  onClose: () => void
  onModeChange: (mode: PayoutDialogMode) => void
  onSave: (input: {
    isActive: boolean
    allocations: Array<{
      recipientType: 'owner' | 'member'
      memberId: string | null
      amountType: 'fixed' | 'percent'
      amountValue: number
      startDate: string
      endDate: string | null
      recurrence: PayoutRecurrence
    }>
  }) => Promise<string | null>
  onCreateOneTime: (input: {
    allocations: Array<{
      recipientType: 'owner' | 'member'
      memberId: string | null
      amountType: 'fixed' | 'percent'
      amountValue: number
      startDate?: string
      endDate?: string | null
    }>
  }) => Promise<string | null>
  onDisable?: () => Promise<string | null>
}

const RECURRENCE_OPTIONS: { value: PayoutRecurrence; label: string }[] = [
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
]

function recipientKey(recipient: Pick<PayoutRecipient, 'recipientType' | 'memberId'>) {
  return recipient.recipientType === 'owner' ? 'owner' : recipient.memberId!
}

function buildDrafts(
  recipients: PayoutRecipient[],
  schedule: PayoutScheduleRecord | null,
  mode: PayoutDialogMode,
): PayoutAllocationDraft[] {
  const byKey = new Map<string, PayoutAllocationInput>()
  if (mode === 'recurring') {
    for (const allocation of schedule?.allocations ?? []) {
      const key = allocation.recipientType === 'owner' ? 'owner' : (allocation.memberId ?? 'member')
      byKey.set(key, allocation)
    }
  }

  return recipients.map((recipient) => {
    const key = recipientKey(recipient)
    const existing = byKey.get(key)
    if (!existing) {
      return {
        recipientType: recipient.recipientType,
        memberId: recipient.memberId,
        amountType: 'fixed' as const,
        amountValue: '',
        startDate: defaultPayoutStartDateInput(),
        endDate: '',
        recurrence: 'monthly' as const,
      }
    }

    return {
      recipientType: recipient.recipientType,
      memberId: recipient.memberId,
      amountType: mode === 'one_time' ? 'fixed' : existing.amountType,
      amountValue: String(existing.amountValue / 100),
      startDate: existing.startDate,
      endDate: existing.endDate || '',
      recurrence: existing.recurrence || 'monthly',
    }
  })
}

function parseDraftAllocations(drafts: PayoutAllocationDraft[]) {
  return drafts
    .map((draft) => ({
      recipientType: draft.recipientType,
      memberId: draft.memberId,
      amountType: draft.amountType,
      amountValue: Number(draft.amountValue.replace(',', '.')),
      startDate: draft.startDate || defaultPayoutStartDateInput(),
      endDate: draft.endDate || null,
      recurrence: draft.recurrence,
    }))
    .filter((row) => row.amountValue > 0)
}

export function PayoutRulesDialog({
  open,
  mode,
  recipients,
  schedule,
  saving = false,
  onClose,
  onModeChange,
  onSave,
  onCreateOneTime,
  onDisable,
}: Props) {
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true)
  const [drafts, setDrafts] = useState<PayoutAllocationDraft[]>(() =>
    buildDrafts(recipients, schedule, mode),
  )
  const [error, setError] = useState('')
  const [editingDraft, setEditingDraft] = useState<PayoutAllocationDraft | null>(null)

  const [oneTimeStep, setOneTimeStep] = useState<'select' | 'amounts'>('select')
  const [selectedRecipientKeys, setSelectedRecipientKeys] = useState<Set<string>>(new Set())

  const editingRecipient = useMemo(() => {
    if (!editingDraft) return null
    return recipients.find(
      (r) => r.recipientType === editingDraft.recipientType && r.memberId === editingDraft.memberId,
    )
  }, [editingDraft, recipients])

  useEffect(() => {
    if (!open) return
    setIsActive(schedule?.isActive ?? true)
    setDrafts(buildDrafts(recipients, schedule, mode))
    setError('')
    setEditingDraft(null)
    setOneTimeStep('select')
    setSelectedRecipientKeys(new Set())
  }, [open, recipients, schedule, mode])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const hasAnyAmount = useMemo(() => {
    return drafts.some((draft) => {
      if (mode === 'one_time') {
        const r = recipients.find(
          (x) => x.recipientType === draft.recipientType && x.memberId === draft.memberId,
        )
        if (!r || !selectedRecipientKeys.has(recipientKey(r))) return false
      }
      return Number(draft.amountValue.replace(',', '.')) > 0
    })
  }, [drafts, mode, recipients, selectedRecipientKeys])

  if (!open) return null

  async function handleSubmit() {
    setError('')

    let finalDrafts = drafts
    if (mode === 'one_time') {
      finalDrafts = drafts.filter((draft) => {
        const r = recipients.find(
          (x) => x.recipientType === draft.recipientType && x.memberId === draft.memberId,
        )
        return r && selectedRecipientKeys.has(recipientKey(r))
      })
    }

    const allocations = parseDraftAllocations(finalDrafts)

    if (allocations.length === 0) {
      setError('Renseignez au moins un montant pour un membre.')
      return
    }

    const message =
      mode === 'one_time'
        ? await onCreateOneTime({ allocations })
        : await onSave({ isActive: true, allocations })

    if (message) {
      setError(message)
      return
    }
    onClose()
  }

  async function handleDisable() {
    if (!onDisable) return
    setError('')
    const message = await onDisable()
    if (message) {
      setError(message)
      return
    }
    onClose()
  }

  function handleNextStep() {
    if (selectedRecipientKeys.size === 0) {
      setError('Veuillez sélectionner au moins un membre.')
      return
    }
    setError('')
    setOneTimeStep('amounts')
  }

  return (
    <div className="team-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="team-modal team-modal--wide revenu-payout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revenu-payout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="team-modal__head">
          <h2 id="revenu-payout-title" className="team-modal__title">
            Virements équipe
          </h2>
          <button type="button" className="team-btn-icon" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="team-modal__body">
          {editingDraft && editingRecipient ? (
            <div className="revenu-payout-edit-view">
              <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>
                Modifier le virement pour {editingRecipient.name}
              </h3>

              <div className="revenu-payout-form__row">
                <label className="revenu-payout-form__label">Type de montant</label>
                {mode === 'one_time' ? (
                  <div
                    className="revenu-payout-form__select"
                    style={{
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    Montant fixe (€)
                  </div>
                ) : (
                  <select
                    className="revenu-payout-form__select"
                    value={editingDraft.amountType}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        amountType: e.target.value as 'fixed' | 'percent',
                      })
                    }
                  >
                    <option value="fixed">Fixe €</option>
                    <option value="percent">Pourcentage du CA</option>
                  </select>
                )}
              </div>

              <div className="revenu-payout-form__row">
                <label className="revenu-payout-form__label">
                  {editingDraft.amountType === 'fixed' ? 'Montant (€)' : 'Pourcentage (%)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="revenu-payout-form__input"
                  value={editingDraft.amountValue}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, amountValue: e.target.value })
                  }
                />
              </div>

              {mode === 'recurring' && (
                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Récurrence</label>
                    <select
                      value={editingDraft.recurrence}
                      onChange={(e) =>
                        setEditingDraft((d) => ({
                          ...d!,
                          recurrence: e.target.value as 'weekly' | 'monthly' | 'quarterly',
                        }))
                      }
                      className="revenu-payout-form__select"
                    >
                      <option value="weekly">Toutes les semaines</option>
                      <option value="monthly">Tous les mois</option>
                      <option value="quarterly">Tous les trimestres</option>
                    </select>
                  </div>
                  <div />
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      Date de départ
                    </label>
                    <input
                      type="date"
                      value={editingDraft.startDate}
                      onChange={(e) =>
                        setEditingDraft((d) => ({ ...d!, startDate: e.target.value }))
                      }
                      className="revenu-payout-form__select"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      Date de fin (optionnel)
                    </label>
                    <input
                      type="date"
                      value={editingDraft.endDate || ''}
                      onChange={(e) =>
                        setEditingDraft((d) =>
                          d ? { ...d, endDate: e.target.value || null } : null,
                        )
                      }
                      className="revenu-payout-form__select"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                className="revenu-payout-mode-toggle"
                role="tablist"
                aria-label="Type de virement"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'recurring'}
                  className={`revenu-payout-mode-toggle__btn${mode === 'recurring' ? ' is-active' : ''}`}
                  onClick={() => onModeChange('recurring')}
                >
                  Automatique
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'one_time'}
                  className={`revenu-payout-mode-toggle__btn${mode === 'one_time' ? ' is-active' : ''}`}
                  onClick={() => onModeChange('one_time')}
                >
                  Unique
                </button>
              </div>

              <p className="team-modal__hint">
                {mode === 'one_time'
                  ? 'Créez un virement immédiat pour l’équipe. Les % s’appliquent sur le CA du mois en cours.'
                  : 'Définissez la récurrence et le montant par membre. Les % s’appliquent sur le CA de la période.'}
              </p>

              <div className="revenu-payout-members">
                {mode === 'one_time'
                  ? oneTimeStep === 'select'
                    ? recipients.map((recipient) => {
                        const key = recipientKey(recipient)
                        const isSelected = selectedRecipientKeys.has(key)
                        return (
                          <div
                            key={key}
                            className="revenu-payout-members__row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'auto 1fr',
                              gap: '16px',
                              alignItems: 'center',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: '#1a1a1a',
                              }}
                              onChange={(e) => {
                                const next = new Set(selectedRecipientKeys)
                                if (e.target.checked) next.add(key)
                                else next.delete(key)
                                setSelectedRecipientKeys(next)
                              }}
                            />
                            <div
                              className="revenu-payout-members__name"
                              onClick={() => {
                                const next = new Set(selectedRecipientKeys)
                                if (!isSelected) next.add(key)
                                else next.delete(key)
                                setSelectedRecipientKeys(next)
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <strong>{recipient.name}</strong>
                            </div>
                          </div>
                        )
                      })
                    : drafts.map((draft, idx) => {
                        const recipient = recipients.find(
                          (row) =>
                            row.recipientType === draft.recipientType &&
                            row.memberId === draft.memberId,
                        )
                        if (!recipient) return null
                        const key = recipientKey(recipient)
                        if (!selectedRecipientKeys.has(key)) return null

                        return (
                          <div
                            key={key}
                            className="revenu-payout-members__row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 150px',
                              gap: '16px',
                              alignItems: 'center',
                            }}
                          >
                            <div className="revenu-payout-members__name">
                              <strong>{recipient.name}</strong>
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="revenu-payout-form__select"
                                placeholder="Montant (€)"
                                value={draft.amountValue}
                                onChange={(e) => {
                                  const newDrafts = [...drafts]
                                  newDrafts[idx] = { ...draft, amountValue: e.target.value }
                                  setDrafts(newDrafts)
                                }}
                              />
                            </div>
                          </div>
                        )
                      })
                  : drafts.map((draft) => {
                      const recipient = recipients.find(
                        (row) =>
                          row.recipientType === draft.recipientType &&
                          row.memberId === draft.memberId,
                      )
                      if (!recipient) return null

                      const hasDates = !!draft.startDate

                      return (
                        <div
                          key={recipientKey(recipient)}
                          className="revenu-payout-members__row"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 32px',
                            gap: '16px',
                            alignItems: 'center',
                          }}
                        >
                          <div className="revenu-payout-members__name">
                            <strong>{recipient.name}</strong>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {draft.amountValue ? (
                              <>
                                <span style={{ fontWeight: 600 }}>
                                  {draft.amountValue} {draft.amountType === 'fixed' ? '€' : '%'}
                                </span>
                                <div
                                  style={{ fontSize: '11px', color: 'var(--color-text-dimmed)' }}
                                >
                                  {draft.recurrence === 'weekly'
                                    ? 'Hebdomadaire'
                                    : draft.recurrence === 'monthly'
                                      ? 'Mensuel'
                                      : 'Trimestriel'}
                                  {hasDates && ` - ${draft.startDate}`}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: 'var(--color-text-dimmed)', fontSize: '12px' }}>
                                Non configuré
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="team-btn-icon"
                            onClick={() => setEditingDraft(draft)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
              </div>
            </>
          )}

          {error ? <p className="team-modal__error">{error}</p> : null}
        </div>

        <div className="team-modal__footer">
          <div className="team-modal__actions">
            {editingDraft ? (
              <>
                <button
                  type="button"
                  className="revenu-payout-btn revenu-payout-btn--ghost"
                  onClick={() => setEditingDraft(null)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="revenu-payout-btn"
                  onClick={() => {
                    setDrafts((prev) =>
                      prev.map((d) =>
                        d.recipientType === editingDraft.recipientType &&
                        d.memberId === editingDraft.memberId
                          ? editingDraft
                          : d,
                      ),
                    )
                    setEditingDraft(null)
                  }}
                >
                  Valider
                </button>
              </>
            ) : (
              <>
                {mode === 'recurring' && schedule && onDisable ? (
                  <button
                    type="button"
                    className="revenu-payout-btn revenu-payout-btn--ghost"
                    onClick={() => void handleDisable()}
                    disabled={saving}
                  >
                    Désactiver
                  </button>
                ) : null}
                <button
                  type="button"
                  className="revenu-payout-btn revenu-payout-btn--ghost"
                  onClick={onClose}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="revenu-payout-btn"
                  onClick={() => {
                    if (mode === 'one_time' && oneTimeStep === 'select') {
                      handleNextStep()
                    } else {
                      void handleSubmit()
                    }
                  }}
                  disabled={
                    saving ||
                    (mode === 'recurring' && !hasAnyAmount) ||
                    (mode === 'one_time' &&
                      oneTimeStep === 'select' &&
                      selectedRecipientKeys.size === 0) ||
                    (mode === 'one_time' && oneTimeStep === 'amounts' && !hasAnyAmount)
                  }
                >
                  {saving
                    ? 'Enregistrement…'
                    : mode === 'one_time'
                      ? oneTimeStep === 'select'
                        ? 'Créer le virement'
                        : 'Confirmer le virement'
                      : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
