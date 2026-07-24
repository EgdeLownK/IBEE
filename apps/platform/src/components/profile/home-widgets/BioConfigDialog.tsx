'use client'

import { useEffect, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { OpeningHourSlot } from '@ibee/supabase'
import { saveContactInfoAction } from '@/app/dashboard/site/contact-actions'
import type { ProfileStudioData } from '@/lib/profile-studio-data'

const DAY_LABELS: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
}
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

type ContactInfo = ProfileStudioData['contactInfo']

interface Props {
  open: boolean
  contactInfo: ContactInfo
  onClose: () => void
  onSaved: (contactInfo: ContactInfo) => void
}

type HourRow = {
  day_of_week: number
  open: boolean
  start_time: string
  end_time: string
}

function hoursFromContact(info: ContactInfo): HourRow[] {
  const byDay = new Map(info.opening_hours.map((s) => [s.day_of_week, s]))
  return DAY_ORDER.map((day) => {
    const slot = byDay.get(day)
    if (!slot || slot.closed) {
      return { day_of_week: day, open: false, start_time: '09:00', end_time: '18:00' }
    }
    return {
      day_of_week: day,
      open: true,
      start_time: slot.start_time ?? '09:00',
      end_time: slot.end_time ?? '18:00',
    }
  })
}

function toOpeningHours(rows: HourRow[]): OpeningHourSlot[] {
  return rows.map((r) => ({
    day_of_week: r.day_of_week,
    closed: !r.open,
    start_time: r.open ? r.start_time : null,
    end_time: r.open ? r.end_time : null,
  }))
}

export function BioConfigDialog({ open, contactInfo, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'contact' | 'hours'>('contact')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [email, setEmail] = useState('')
  const [phoneEnabled, setPhoneEnabled] = useState(false)
  const [phone, setPhone] = useState('')
  const [messageEnabled, setMessageEnabled] = useState(false)
  const [hoursEnabled, setHoursEnabled] = useState(false)
  const [hourRows, setHourRows] = useState<HourRow[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setTab('contact')
    setEmailEnabled(contactInfo.contact_email_public)
    setEmail(contactInfo.contact_email ?? '')
    setPhoneEnabled(contactInfo.contact_phone_public)
    setPhone(contactInfo.contact_phone ?? '')
    setMessageEnabled(contactInfo.message_enabled)
    setHoursEnabled(contactInfo.opening_hours_enabled)
    setHourRows(hoursFromContact(contactInfo))
  }, [open, contactInfo])

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

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      contact_email: email || null,
      contact_email_public: emailEnabled,
      contact_phone: phone || null,
      contact_phone_public: phoneEnabled,
      message_enabled: messageEnabled,
      opening_hours_enabled: hoursEnabled,
      opening_hours: toOpeningHours(hourRows),
    }

    startTransition(async () => {
      const result = await saveContactInfoAction(payload)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onSaved({
        entity_id: contactInfo.entity_id,
        ...result.contactInfo,
      })
      toast.success('Bio mise à jour')
      onClose()
    })
  }

  return (
    <div className="hw-config" role="presentation">
      <button type="button" className="hw-config__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="hw-config__panel hw-config__panel--bio" role="dialog" aria-modal="true">
        <header className="hw-config__head">
          <h2 className="hw-config__title">Configurer la bio</h2>
          <button type="button" className="hw-config__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <form className="hw-config__form" onSubmit={handleSubmit}>
          <nav className="hw-config__bio-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`hw-config__bio-tab${tab === 'contact' ? ' is-active' : ''}`}
              aria-selected={tab === 'contact'}
              onClick={() => setTab('contact')}
            >
              Contact
            </button>
            <button
              type="button"
              role="tab"
              className={`hw-config__bio-tab${tab === 'hours' ? ' is-active' : ''}`}
              aria-selected={tab === 'hours'}
              onClick={() => setTab('hours')}
            >
              Horaires
            </button>
          </nav>

          {tab === 'contact' && (
            <div className="hw-config__bio-pane is-active" role="tabpanel">
              <p className="hw-config__hint">
                Active uniquement les contacts que tu veux afficher — seul, en duo ou les trois.
              </p>

              <div className="hw-config__bio-block">
                <p className="hw-config__bio-block-title">Email</p>
                <fieldset className="hw-config__fieldset">
                  <label className="hw-config__radio">
                    <input
                      type="radio"
                      name="bio_email"
                      checked={!emailEnabled}
                      onChange={() => setEmailEnabled(false)}
                    />
                    <span>Non</span>
                  </label>
                  <label className="hw-config__radio">
                    <input
                      type="radio"
                      name="bio_email"
                      checked={emailEnabled}
                      onChange={() => setEmailEnabled(true)}
                    />
                    <span>Oui</span>
                  </label>
                </fieldset>
                {emailEnabled && (
                  <input
                    type="email"
                    className="hw-config__input"
                    placeholder="contact@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </div>

              <div className="hw-config__bio-block">
                <p className="hw-config__bio-block-title">Téléphone</p>
                <fieldset className="hw-config__fieldset">
                  <label className="hw-config__radio">
                    <input
                      type="radio"
                      name="bio_phone"
                      checked={!phoneEnabled}
                      onChange={() => setPhoneEnabled(false)}
                    />
                    <span>Non</span>
                  </label>
                  <label className="hw-config__radio">
                    <input
                      type="radio"
                      name="bio_phone"
                      checked={phoneEnabled}
                      onChange={() => setPhoneEnabled(true)}
                    />
                    <span>Oui</span>
                  </label>
                </fieldset>
                {phoneEnabled && (
                  <input
                    type="tel"
                    className="hw-config__input"
                    placeholder="+33 6 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                )}
              </div>

              <div className="hw-config__bio-block">
                <p className="hw-config__bio-block-title">Envoyer un message</p>
                <fieldset className="hw-config__fieldset">
                  <label className="hw-config__radio">
                    <input
                      type="radio"
                      name="bio_message"
                      checked={!messageEnabled}
                      onChange={() => setMessageEnabled(false)}
                    />
                    <span>Non</span>
                  </label>
                  <label className="hw-config__radio">
                    <input
                      type="radio"
                      name="bio_message"
                      checked={messageEnabled}
                      onChange={() => setMessageEnabled(true)}
                    />
                    <span>Oui</span>
                  </label>
                </fieldset>
                <p className="hw-config__bio-block-hint">
                  Les visiteurs pourront vous écrire via la messagerie IBEE.
                </p>
              </div>
            </div>
          )}

          {tab === 'hours' && (
            <div className="hw-config__bio-pane is-active" role="tabpanel">
              <fieldset className="hw-config__fieldset">
                <legend className="hw-config__bio-block-title">Afficher les horaires</legend>
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="bio_hours"
                    checked={!hoursEnabled}
                    onChange={() => setHoursEnabled(false)}
                  />
                  <span>Non</span>
                </label>
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="bio_hours"
                    checked={hoursEnabled}
                    onChange={() => setHoursEnabled(true)}
                  />
                  <span>Oui</span>
                </label>
              </fieldset>

              {hoursEnabled && (
                <div className="hw-config__hours">
                  {hourRows.map((row, i) => (
                    <div key={row.day_of_week} className="hw-config__hours-row">
                      <label className="hw-config__hours-day">
                        <input
                          type="checkbox"
                          checked={row.open}
                          onChange={(e) =>
                            setHourRows((prev) =>
                              prev.map((r, j) => (j === i ? { ...r, open: e.target.checked } : r)),
                            )
                          }
                        />
                        <span>{DAY_LABELS[row.day_of_week]}</span>
                      </label>
                      <input
                        type="time"
                        className="hw-config__hours-time"
                        disabled={!row.open}
                        value={row.start_time}
                        onChange={(e) =>
                          setHourRows((prev) =>
                            prev.map((r, j) =>
                              j === i ? { ...r, start_time: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      <span className="hw-config__hours-sep">–</span>
                      <input
                        type="time"
                        className="hw-config__hours-time"
                        disabled={!row.open}
                        value={row.end_time}
                        onChange={(e) =>
                          setHourRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, end_time: e.target.value } : r)),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <footer className="hw-config__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--dark" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
