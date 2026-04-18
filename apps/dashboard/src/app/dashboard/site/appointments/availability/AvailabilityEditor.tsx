'use client'

import { useState } from 'react'
import { Plus, Trash2, CalendarOff, Calendar } from 'lucide-react'
import { Input } from '@agora/ui-react'
import { saveAvailabilityAction, addExceptionAction, removeExceptionAction } from '../actions'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

type Schedule = { id: string; day_of_week: number; start_time: string; end_time: string }
type Exception = { id: string; date: string; is_blocked: boolean; reason: string | null }

type Props = {
  initialSchedules: Schedule[]
  initialExceptions: Exception[]
}

export function AvailabilityEditor({ initialSchedules, initialExceptions }: Props) {
  const [schedules, setSchedules] = useState(() => {
    const map: Record<number, { start: string; end: string }[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    initialSchedules.forEach(s => {
      map[s.day_of_week] = map[s.day_of_week] ?? []
      map[s.day_of_week].push({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) })
    })
    return map
  })
  const [exceptions, setExceptions] = useState(initialExceptions)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Bloc formulaire exception
  const [blockMode, setBlockMode] = useState<'day' | 'period'>('day')
  const [blockDate, setBlockDate] = useState('')
  const [blockDateEnd, setBlockDateEnd] = useState('')
  const [blockReason, setBlockReason] = useState('')

  // --- Horaires ---

  function addSlot(day: number) {
    setSchedules(prev => ({
      ...prev,
      [day]: [...prev[day], { start: '09:00', end: '17:00' }],
    }))
    setSaved(false)
  }

  function removeSlot(day: number, idx: number) {
    setSchedules(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }))
    setSaved(false)
  }

  function updateSlot(day: number, idx: number, field: 'start' | 'end', value: string) {
    setSchedules(prev => ({
      ...prev,
      [day]: prev[day].map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const flat = Object.entries(schedules).flatMap(([day, slots]) =>
      slots.map(s => ({ day_of_week: Number(day), start_time: s.start, end_time: s.end }))
    )
    const result = await saveAvailabilityAction(flat)
    setSaving(false)
    if (result.success) setSaved(true)
  }

  // --- Exceptions ---

  async function handleAddException() {
    if (!blockDate) return

    if (blockMode === 'day') {
      const result = await addExceptionAction({ date: blockDate, is_blocked: true, reason: blockReason || null })
      if (result.success) { setBlockDate(''); setBlockReason(''); window.location.reload() }
    } else {
      if (!blockDateEnd || blockDateEnd < blockDate) return
      // Ajouter chaque jour de la periode
      const start = new Date(blockDate + 'T12:00:00')
      const end = new Date(blockDateEnd + 'T12:00:00')
      const promises = []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        promises.push(addExceptionAction({ date: dateStr, is_blocked: true, reason: blockReason || null }))
      }
      await Promise.all(promises)
      setBlockDate(''); setBlockDateEnd(''); setBlockReason('')
      window.location.reload()
    }
  }

  async function handleRemoveException(id: string) {
    await removeExceptionAction(id)
    setExceptions(prev => prev.filter(e => e.id !== id))
  }

  // Grouper les exceptions par periodes consecutives
  const sortedExceptions = [...exceptions].sort((a, b) => a.date.localeCompare(b.date))
  type ExGroup = { ids: string[]; startDate: string; endDate: string; reason: string | null; count: number }
  const groups: ExGroup[] = []

  sortedExceptions.forEach(ex => {
    const last = groups[groups.length - 1]
    if (last && last.reason === ex.reason) {
      const lastEnd = new Date(last.endDate + 'T12:00:00')
      lastEnd.setDate(lastEnd.getDate() + 1)
      const exDate = new Date(ex.date + 'T12:00:00')
      if (exDate.getTime() === lastEnd.getTime()) {
        last.endDate = ex.date
        last.ids.push(ex.id)
        last.count++
        return
      }
    }
    groups.push({ ids: [ex.id], startDate: ex.date, endDate: ex.date, reason: ex.reason, count: 1 })
  })

  function formatExDate(date: string) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'))
  }

  return (
    <div className="space-y-8">
      {/* Horaires hebdomadaires */}
      <div>
        <h2 className="mb-1 text-base font-semibold text-neutral-900">Horaires hebdomadaires</h2>
        <p className="mb-4 text-xs text-neutral-500">Definissez vos tranches horaires pour chaque jour. Ajoutez plusieurs creneaux par jour (ex: matin + apres-midi).</p>
        <div className="space-y-3">
          {DAYS.map((dayName, dayIdx) => (
            <div key={dayIdx} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-neutral-900 w-24 pt-1.5">{dayName}</span>
                <div className="flex flex-1 flex-col gap-2">
                  {schedules[dayIdx].length === 0 ? (
                    <span className="text-xs text-neutral-400 pt-1.5">Indisponible</span>
                  ) : (
                    schedules[dayIdx].map((slot, slotIdx) => (
                      <div key={slotIdx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={e => updateSlot(dayIdx, slotIdx, 'start', e.target.value)}
                          className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                        />
                        <span className="text-xs text-neutral-400">a</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={e => updateSlot(dayIdx, slotIdx, 'end', e.target.value)}
                          className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
                        />
                        <button type="button" onClick={() => removeSlot(dayIdx, slotIdx)} className="text-neutral-400 transition hover:text-error">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => addSlot(dayIdx)}
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                  title="Ajouter un creneau"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
          </button>
          {saved && <span className="text-sm text-success">Horaires enregistres.</span>}
        </div>
      </div>

      {/* Indisponibilites */}
      <div>
        <h2 className="mb-1 text-base font-semibold text-neutral-900">Indisponibilites</h2>
        <p className="mb-4 text-xs text-neutral-500">Bloquez un jour precis ou une periode entiere (conges, formations, vacances...).</p>

        {/* Mode selector */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setBlockMode('day')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${blockMode === 'day' ? 'border-accent bg-accent/10 text-accent' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}
          >
            <CalendarOff className="h-3.5 w-3.5" />
            Jour
          </button>
          <button
            type="button"
            onClick={() => setBlockMode('period')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${blockMode === 'period' ? 'border-accent bg-accent/10 text-accent' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Periode
          </button>
        </div>

        {/* Formulaire */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              {blockMode === 'day' ? 'Date' : 'Du'}
            </label>
            <Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} />
          </div>
          {blockMode === 'period' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Au</label>
              <Input type="date" value={blockDateEnd} onChange={e => setBlockDateEnd(e.target.value)} min={blockDate} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Raison (optionnel)</label>
            <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ex: Conges, Formation..." />
          </div>
          <button
            onClick={handleAddException}
            disabled={!blockDate || (blockMode === 'period' && !blockDateEnd)}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Bloquer
          </button>
        </div>

        {/* Liste groupee */}
        {groups.length === 0 ? (
          <p className="text-xs text-neutral-400">Aucune indisponibilite planifiee.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-0 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CalendarOff className="h-4 w-4 text-neutral-400" />
                  <div>
                    <span className="text-sm text-neutral-900">
                      {g.count === 1
                        ? formatExDate(g.startDate)
                        : `${formatExDate(g.startDate)} → ${formatExDate(g.endDate)}`
                      }
                    </span>
                    {g.count > 1 && (
                      <span className="ml-1.5 text-xs text-neutral-400">({g.count} jours)</span>
                    )}
                    {g.reason && <span className="ml-2 text-xs text-neutral-400">— {g.reason}</span>}
                  </div>
                </div>
                <button
                  onClick={() => g.ids.forEach(id => handleRemoveException(id))}
                  className="text-neutral-400 transition hover:text-error"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
