'use client'

import { useEffect, useState, useTransition } from 'react'
import { JobOffer, JobCompType, JobCompFreq } from '@ibee/supabase'
import { createJobOfferAction, updateJobOfferAction } from '../../../app/dashboard/talent/talent-actions'
import { Input } from '@ibee/ui-react'
import { ArrowDown, ArrowUp, Edit, Image as ImageIcon, Plus, Trash, Trash2, Type, X, ExternalLink, List } from 'lucide-react'
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

  if (!open) return null

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {step === 1 ? (
        <div className="bg-white rounded-xl shadow-lg w-full max-w-[500px] p-6 relative max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">
            {isEditing ? "Modifier l'offre" : "Nouvelle offre d'emploi"}
          </h2>

          <div className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            
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

            <div className="mt-6 flex justify-end gap-2 pt-4">
              <button type="button" className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-md text-sm font-medium transition" onClick={() => onOpenChange(false)}>
                Annuler
              </button>
              <button type="button" onClick={handleNext} className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-sm font-medium transition">
                Suivant (Étape 2)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col relative max-h-[90vh]">
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Étape 2 / 2</p>
              <h2 className="text-xl font-semibold">Description de l'offre</h2>
              <p className="text-sm text-neutral-500 mt-1">Composez l'offre avec des blocs texte et images.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-neutral-50">
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="space-y-6 max-w-xl mx-auto">
              {blocks.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white">
                  <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Type className="h-6 w-6 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900">La description est vide</h3>
                  <p className="text-neutral-500 mt-1 mb-4 text-sm">Ajoutez votre premier bloc pour décrire l'offre.</p>
                </div>
              ) : (
                blocks.map((block, i) => (
                  <article key={block.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                    <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-neutral-600">
                          {block.type === 'text' ? 'Paragraphe' : block.type === 'image' ? 'Visuel' : 'Liste'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={i === 0} onClick={() => moveBlock(i, -1)} className="p-1.5 text-neutral-400 hover:text-neutral-900 disabled:opacity-30 rounded hover:bg-neutral-200">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button type="button" disabled={i === blocks.length - 1} onClick={() => moveBlock(i, 1)} className="p-1.5 text-neutral-400 hover:text-neutral-900 disabled:opacity-30 rounded hover:bg-neutral-200">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-neutral-300 mx-1" />
                        <button type="button" onClick={() => removeBlock(i)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </header>
                    <div className="p-4">
                      {block.type === 'text' ? (
                        <div className="relative">
                          <textarea
                            className="w-full min-h-[120px] rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-y"
                            maxLength={HISTORY_TEXT_MAX}
                            placeholder="Ex. : Nous recherchons une personne passionnée par..."
                            value={block.content}
                            onChange={(e) => updateBlock(i, { ...block, content: e.target.value })}
                          />
                          <div className="absolute bottom-3 right-3 text-xs text-neutral-400 bg-white/80 px-1 rounded">
                            {block.content.length} / {HISTORY_TEXT_MAX}
                          </div>
                        </div>
                      ) : block.type === 'list' ? (
                        <div className="space-y-3 px-2 py-1">
                          {block.items.map((item, itemIndex) => (
                            <div key={item.id} className="flex items-start gap-3">
                              <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                              <input
                                type="text"
                                className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                placeholder="Élément de la liste..."
                                value={item.value}
                                onChange={(e) => {
                                  const newItems = [...block.items]
                                  newItems[itemIndex] = { ...newItems[itemIndex], value: e.target.value }
                                  updateBlock(i, { ...block, items: newItems })
                                }}
                              />
                              <button
                                type="button"
                                className="mt-1 p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                                onClick={() => {
                                  const newItems = block.items.filter((_, idx) => idx !== itemIndex)
                                  updateBlock(i, { ...block, items: newItems })
                                }}
                                aria-label="Supprimer cet élément"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="text-sm text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center gap-1 mt-2"
                            onClick={() => {
                              updateBlock(i, { ...block, items: [...block.items, { id: nextBlockId(), value: '' }] })
                            }}
                          >
                            <Plus className="h-4 w-4" /> Ajouter une puce
                          </button>
                        </div>
                      ) : (
                        <HistoryImageBlockEditor
                          block={block}
                          onChange={(next) => updateBlock(i, next)}
                        />
                      )}
                    </div>
                  </article>
                ))
              )}

              <div className="pt-4 border-t border-neutral-200">
                <p className="text-sm font-medium text-neutral-900 mb-3">Ajouter un bloc</p>
                <div className="grid grid-cols-3 gap-3">
                  <button type="button" onClick={addTextBlock} className="flex flex-col items-center justify-center p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Type className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Texte</span>
                  </button>
                  <button type="button" onClick={addListBlock} className="flex flex-col items-center justify-center p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <List className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Liste</span>
                  </button>
                  <button type="button" onClick={addImageBlock} className="flex flex-col items-center justify-center p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-neutral-100 flex justify-between items-center bg-white rounded-b-xl">
            <button type="button" className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-md text-sm font-medium transition" onClick={() => setStep(1)}>
              Retour
            </button>
            <button type="button" onClick={handleSubmit} disabled={isPending} className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-sm font-medium transition disabled:opacity-50">
              {isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour l\'offre' : 'Créer l\'offre'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
