'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { JobOffer, JobCompType, JobCompFreq } from '@ibee/supabase'
import { createJobOfferAction, updateJobOfferAction } from '../../../app/dashboard/talent/talent-actions'
import { Input } from '@ibee/ui-react'
import { ArrowDown, ArrowUp, Edit, Image as ImageIcon, Plus, Trash, Trash2, Type, X, ExternalLink, List, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { HISTORY_MAX_BLOCKS, HISTORY_TEXT_MAX, HistoryBlock, parseHistoryBlocks } from '@ibee/shared'
import { 
  DraftBlock, 
  draftBlocksFromInitial, 
  nextBlockId, 
  serializeDraftBlocks 
} from '../../profile/history/history-edit-utils'
import { HistoryImageBlockEditor } from '../../profile/history/HistoryImageBlockEditor'

type JobOfferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  offer?: JobOffer | null
}

export function JobOfferDialog({ open, onOpenChange, entityId, offer }: JobOfferDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const isEditing = !!offer

  // Step 1 states
  const [title, setTitle] = useState(offer?.title || '')
  const [contractType, setContractType] = useState(offer?.contract_type || 'cdi')
  const [status, setStatus] = useState(offer?.status || 'inactive')
  const [locationType, setLocationType] = useState(offer?.location_type || 'onsite')
  const [locationText, setLocationText] = useState(offer?.location_text || '')
  const [compType, setCompType] = useState<JobCompType | ''>(offer?.compensation_type || '')
  const [compAmount, setCompAmount] = useState<string>(offer?.compensation_amount?.toString() || '')
  const [compFreq, setCompFreq] = useState<JobCompFreq | ''>(offer?.compensation_frequency || '')
  const [applyUrl, setApplyUrl] = useState(offer?.apply_url || '')

  // Step 2 states
  const [blocks, setBlocks] = useState<DraftBlock[]>([])

  useEffect(() => {
    if (open) {
      setStep(1)
      setError(null)
      setTitle(offer?.title || '')
      setContractType(offer?.contract_type || 'cdi')
      setStatus(offer?.status || 'inactive')
      setLocationType(offer?.location_type || 'onsite')
      setLocationText(offer?.location_text || '')
      setCompType(offer?.compensation_type || '')
      setCompAmount(offer?.compensation_amount?.toString() || '')
      setCompFreq(offer?.compensation_frequency || '')
      setApplyUrl(offer?.apply_url || '')
      
      const initialBlocks = offer?.blocks ? parseHistoryBlocks(offer.blocks) : []
      setBlocks(draftBlocksFromInitial(initialBlocks))
    }
  }, [open, offer])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  if (!open || typeof document === 'undefined') return null

  // --- Step 2 Block Functions ---
  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= blocks.length) return
    setBlocks((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
      return copy
    })
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  function addTextBlock() {
    if (blocks.length >= HISTORY_MAX_BLOCKS) {
      setError(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
      return
    }
    setBlocks((prev) => [...prev, { id: nextBlockId(), type: 'text', content: '' }])
  }

  function addImageBlock() {
    if (blocks.length >= HISTORY_MAX_BLOCKS) {
      setError(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
      return
    }
    setBlocks((prev) => [
      ...prev,
      {
        id: nextBlockId(),
        type: 'image',
        slot_count: 1,
        images: [],
        title: '',
        description: '',
        uploading: false,
      },
    ])
  }

  function addListBlock() {
    if (blocks.length >= HISTORY_MAX_BLOCKS) {
      setError(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
      return
    }
    setBlocks((prev) => [...prev, { id: nextBlockId(), type: 'list', items: [{ id: nextBlockId(), value: '' }] }])
  }

  function updateBlock(index: number, block: DraftBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)))
  }

  const handleNext = () => {
    if (!title.trim()) {
      setError('Veuillez renseigner le titre du poste.')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleSubmit = async () => {
    setError(null)
    if (blocks.some((b) => b.type === 'image' && b.uploading)) {
      setError('Patiente, une image est en cours d\'envoi.')
      return
    }

    let payloadBlocks: HistoryBlock[]
    try {
      payloadBlocks = serializeDraftBlocks(blocks)
    } catch (err: any) {
      setError(err.message || 'Blocs invalides.')
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          title,
          contract_type: contractType as any,
          status: status as any,
          location_type: locationType as any,
          location_text: locationText || null,
          blocks: payloadBlocks,
          compensation_type: compType ? (compType as JobCompType) : null,
          compensation_amount: compAmount ? parseFloat(compAmount) : null,
          compensation_frequency: compFreq ? (compFreq as JobCompFreq) : null,
          apply_url: applyUrl || null,
        }

        if (isEditing && offer) {
          await updateJobOfferAction(entityId, offer.id, payload)
        } else {
          await createJobOfferAction(entityId, payload)
        }
        onOpenChange(false)
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue.')
      }
    })
  }

  return createPortal(
    <div className="pco-root" role="presentation">
      <button type="button" className="pco-root__backdrop" aria-label="Fermer" onClick={() => onOpenChange(false)} />
      <div className="pco__panel" role="dialog" aria-modal="true" aria-labelledby="pco-title">
        <header className="pco__header">
          <h2 id="pco-title" className="pco__title">
            {isEditing ? "Modifier l'offre" : "Nouvelle offre"}
          </h2>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="pco__steps" aria-label="Étapes de création">
          {[1, 2].map((n) => (
            <span
              key={n}
              className={`pco__step${step === n ? ' is-active' : ''}${step > n ? ' is-done' : ''}`}
            >
              <span className="pco__step-num">{n}</span>
              <span className="pco__step-label">
                {n === 1 ? 'Informations' : 'Contenu'}
              </span>
            </span>
          ))}
        </nav>

        <div className="pco__scroll">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 mx-4 mt-4 rounded-md text-sm font-medium">
              {error}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre du poste *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Développeur Fullstack React" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type de contrat *</label>
                  <select value={contractType} onChange={(e) => setContractType(e.target.value as any)} className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300">
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="mission">Mission / Freelance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lieu de travail *</label>
                  <select value={locationType} onChange={(e) => setLocationType(e.target.value as any)} className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300">
                    <option value="onsite">Sur site</option>
                    <option value="remote">100% Télétravail</option>
                    <option value="hybrid">Hybride</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ville (optionnel)</label>
                <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Ex: Paris, France" />
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3">Rémunération</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-500">Type</label>
                    <select value={compType} onChange={(e) => setCompType(e.target.value as any)} className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300">
                      <option value="">Non spécifié</option>
                      <option value="fixed">Fixe (€)</option>
                      <option value="percentage">Pourcentage (%)</option>
                    </select>
                  </div>
                  {compType && (
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-neutral-500">
                          Montant
                        </label>
                        <div className="relative">
                          <Input 
                            type="number"
                            placeholder="0.00" 
                            value={compAmount}
                            onChange={(e) => setCompAmount(e.target.value)}
                            className="pr-8"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500 text-sm">
                            {compType === 'percentage' ? '%' : '€'}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-neutral-500">
                          Fréquence
                        </label>
                        <select value={compFreq} onChange={(e) => setCompFreq(e.target.value as any)} className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300">
                          <option value="">Au choix</option>
                          <option value="weekly">Par semaine</option>
                          <option value="monthly">Par mois</option>
                          <option value="mission">À la mission</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-2 space-y-2">
                <label className="text-sm font-medium">Lien ou Email pour postuler (optionnel)</label>
                <Input value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="Ex: https://forms.gle/... ou jobs@entreprise.com" />
              </div>
            </div>
          ) : (
            <section className="pco__stage p-6">
              <span className="pco__label">
                Contenu détaillé de l'offre <span className="pco__hint">(max {HISTORY_MAX_BLOCKS} blocs)</span>
              </span>
              <div className="pco__blocks">
                {blocks.map((b, i) => (
                  <div key={b.id} className="pco__block-card">
                    <div className="pco__block-head">
                      <span className="pco__block-tag">{b.type === 'text' ? 'Texte' : b.type === 'list' ? 'Liste' : 'Image'}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="pco__icon-btn"
                          disabled={i === 0}
                          onClick={() => moveBlock(i, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="pco__icon-btn"
                          disabled={i === blocks.length - 1}
                          onClick={() => moveBlock(i, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="pco__icon-btn text-red-500 hover:text-red-600 hover:bg-red-50"
                          aria-label="Supprimer"
                          onClick={() => removeBlock(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {b.type === 'text' ? (
                      <textarea
                        className="pco__input"
                        rows={4}
                        maxLength={HISTORY_TEXT_MAX}
                        placeholder="Ex. : Nous recherchons une personne passionnée par..."
                        value={b.content}
                        onChange={(e) => updateBlock(i, { ...b, content: e.target.value })}
                      />
                    ) : b.type === 'list' ? (
                      <div className="flex flex-col gap-2">
                        {b.items.map((item, itemIndex) => (
                          <div key={item.id} className="flex gap-2 items-start">
                            <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-neutral-800 shrink-0" />
                            <textarea
                              className="pco__input flex-1 min-h-[40px] resize-none"
                              rows={1}
                              placeholder="Élément de la liste"
                              value={item.value}
                              onChange={(e) => {
                                const newItems = [...b.items]
                                newItems[itemIndex] = { ...newItems[itemIndex], value: e.target.value }
                                updateBlock(i, { ...b, items: newItems })
                              }}
                            />
                            {b.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = b.items.filter((_, idx) => idx !== itemIndex)
                                  updateBlock(i, { ...b, items: newItems })
                                }}
                                className="pco__icon-btn mt-1 text-neutral-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 self-start mt-1 flex items-center gap-1"
                          onClick={() => {
                            updateBlock(i, { ...b, items: [...b.items, { id: nextBlockId(), value: '' }] })
                          }}
                        >
                          <Plus className="h-3 w-3" /> Ajouter un élément
                        </button>
                      </div>
                    ) : (
                      <HistoryImageBlockEditor
                        block={b}
                        onChange={(next) => updateBlock(i, next)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="pco__block-add-row">
                <button type="button" className="pco__add-btn" onClick={addTextBlock}>
                  <Type className="h-4 w-4" /> Texte
                </button>
                <button type="button" className="pco__add-btn" onClick={addListBlock}>
                  <List className="h-4 w-4" /> Liste
                </button>
                <button type="button" className="pco__add-btn" onClick={addImageBlock}>
                  <ImageIcon className="h-4 w-4" /> Image
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="pco__actions">
          <div className="pco__actions-start">
            {step === 1 ? (
              <button type="button" className="pco__btn pco__btn--ghost" onClick={() => onOpenChange(false)}>
                Annuler
              </button>
            ) : (
              <button type="button" className="pco__btn pco__btn--ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
            )}
          </div>
          <div className="pco__actions-end flex items-center gap-3">
            {step === 1 ? (
              <button type="button" className="pco__btn pco__btn--primary" onClick={handleNext}>
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" className="pco__btn pco__btn--primary" disabled={isPending} onClick={handleSubmit}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <span>{isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour l\'offre' : 'Créer l\'offre'}</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  )
}
