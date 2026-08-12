'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { JobOffer, JobCompType, JobCompFreq, JobContractType, JobSector } from '@ibee/supabase'
import {
  createJobOfferAction,
  updateJobOfferAction,
  getJobOfferMediaAction,
  getJobOfferSkillsAction,
} from '../../../app/dashboard/talent/talent-actions'
import { JobSkillsPicker, type JobSkillTag } from './JobSkillsPicker'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import { Input } from '@ibee/ui-react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Type,
  X,
  List,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import {
  HISTORY_MAX_BLOCKS,
  HISTORY_TEXT_MAX,
  HistoryBlock,
  parseHistoryBlocks,
  MAX_JOB_OFFER_SKILLS,
} from '@ibee/shared'
import {
  DraftBlock,
  draftBlocksFromInitial,
  nextBlockId,
  serializeDraftBlocks,
} from '../../profile/history/history-edit-utils'
import { HistoryImageBlockEditor } from '../../profile/history/HistoryImageBlockEditor'

// Types eligibles au statut cadre (decision produit, mission
// feat/job-offer-contract-types-ui) : la case est masquee pour les autres,
// meme motif que la localisation masquee pour le teletravail ci-dessous.
const CADRE_ELIGIBLE_TYPES: JobContractType[] = ['cdi', 'cdd', 'interim']

// Meme forme que MediaDraft (product-create/types.ts) - dupliquee ici plutot
// qu'importee : ces deux domaines (talent/boutique) ne partagent pas de
// dependance directe (voir apps/platform/CLAUDE.md, frontiere par domaine).
// L'action serveur d'upload (uploadProductMediaAction), elle, est bien
// reutilisee telle quelle - c'est le mecanisme partage qui compte, pas le
// type client local.
type JobOfferMediaDraft = {
  id: string
  type: 'image' | 'video'
  url: string
  previewUrl: string
  uploading: boolean
}

// Limites cote client - MIROIR EXACT des constantes serveur
// (MAX_JOB_OFFER_MEDIA/MAX_JOB_OFFER_VIDEOS, talent-actions.ts), qui restent
// la source de verite (verifiees a nouveau server-side, un appel direct a
// l'action ne peut pas les contourner). A VALIDER PAR KILLIAN - voir rapport
// phase 0 mission feat/job-offer-media-form : reprises par defaut des
// limites boutique (StepEssentials.tsx), faute de besoin metier connu
// specifique aux offres.
const MAX_JOB_OFFER_MEDIA = 10
const MAX_JOB_OFFER_VIDEOS = 1

function jobOfferMediaHasVideo(media: JobOfferMediaDraft[]): boolean {
  return media.some((m) => m.type === 'video')
}

function canAddJobOfferMedia(media: JobOfferMediaDraft[]): boolean {
  return media.length < MAX_JOB_OFFER_MEDIA
}

type JobOfferDialogProps = {
  open: boolean
  // `reason: 'success'` distingue une fermeture par creation reussie d'une
  // fermeture par annulation (backdrop, croix, Echap, bouton Annuler) - les
  // deux passent par le meme onOpenChange(false) mais l'appelant a besoin de
  // savoir laquelle s'est produite pour decider s'il doit rouvrir un overlay
  // parent (voir ProfileStudio.tsx). `meta` n'est fourni qu'avec 'success' :
  // isCreate distingue creation/edition, status le statut envoye au serveur -
  // necessaire pour que l'appelant sache s'il doit basculer sur l'onglet
  // Offres (creation + publication active uniquement).
  onOpenChange: (
    open: boolean,
    reason?: 'success',
    meta?: { isCreate: boolean; status: 'active' | 'inactive' },
  ) => void
  entityId: string
  offer?: JobOffer | null
  /** Triee par display_order par l'appelant (voir listJobSectors, @ibee/supabase). */
  sectors: JobSector[]
}

export function JobOfferDialog({
  open,
  onOpenChange,
  entityId,
  offer,
  sectors,
}: JobOfferDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  // Distingue quel bouton est en vol (creation seulement, deux boutons) pour
  // afficher le bon libelle/spinner - inutile en edition (un seul bouton).
  const [pendingIntent, setPendingIntent] = useState<'publish' | 'draft' | null>(null)

  const isEditing = !!offer

  // Step 1 "Vitrine" states
  const [media, setMedia] = useState<JobOfferMediaDraft[]>([])
  const [title, setTitle] = useState(offer?.title || '')
  const [sectorId, setSectorId] = useState(offer?.sector_id || '')
  // Step 2 "Informations" states
  const [contractType, setContractType] = useState<JobContractType>(offer?.contract_type || 'cdi')
  const [isCadre, setIsCadre] = useState<boolean>(offer?.is_cadre ?? false)
  const [status, setStatus] = useState(offer?.status || 'inactive')
  const [locationType, setLocationType] = useState(offer?.location_type || 'onsite')
  const [locationText, setLocationText] = useState(offer?.location_text || '')
  const [compType, setCompType] = useState<JobCompType>(offer?.compensation_type || 'fixed')
  const [compAmount, setCompAmount] = useState<string>(offer?.compensation_amount?.toString() || '')
  const [compFreq, setCompFreq] = useState<JobCompFreq>(offer?.compensation_frequency || 'monthly')
  const [applyUrl, setApplyUrl] = useState(offer?.apply_url || '')
  const [endDate, setEndDate] = useState(offer?.end_date || '')

  // Step 3 "Compétences" state
  const [skills, setSkills] = useState<JobSkillTag[]>([])
  // Step 4 "Contenu" states
  const [blocks, setBlocks] = useState<DraftBlock[]>([])

  useEffect(() => {
    if (open) {
      setStep(1)
      setError(null)
      setTitle(offer?.title || '')
      setSectorId(offer?.sector_id || '')
      setContractType(offer?.contract_type || 'cdi')
      setIsCadre(offer?.is_cadre ?? false)
      setStatus(offer?.status || 'inactive')
      setLocationType(offer?.location_type || 'onsite')
      setLocationText(offer?.location_text || '')
      setCompType(offer?.compensation_type || 'fixed')
      setCompAmount(offer?.compensation_amount?.toString() || '')
      setCompFreq(offer?.compensation_frequency || 'monthly')
      setApplyUrl(offer?.apply_url || '')
      setEndDate(offer?.end_date || '')

      const initialBlocks = offer?.blocks ? parseHistoryBlocks(offer.blocks) : []
      setBlocks(draftBlocksFromInitial(initialBlocks))

      // Medias : table separee (entity_job_offer_media), pas portee par
      // `offer` (JobOffer) - rechargee a chaque ouverture depuis le serveur.
      // Reset synchrone (creation, ou avant que la lecture async resolve en
      // edition) + garde `cancelled` pour ignorer un resultat perime si le
      // dialogue se refermait/rouvrait sur une autre offre entre-temps.
      setMedia([])
      if (offer) {
        let cancelled = false
        getJobOfferMediaAction(entityId, offer.id)
          .then((rows) => {
            if (cancelled) return
            setMedia(
              rows.map((r) => ({
                id: r.id,
                type: r.media_type,
                url: r.url,
                previewUrl: r.url,
                uploading: false,
              })),
            )
          })
          .catch(() => {
            if (cancelled) return
            toast.error('Impossible de charger les médias de cette offre.')
          })
        return () => {
          cancelled = true
        }
      }
    }
  }, [open, offer, entityId])

  // Aptitudes : table separee (entity_job_offer_skills), meme motif que les
  // medias ci-dessus (reset synchrone + garde `cancelled`, effet distinct
  // pour ne pas entremeler les deux nettoyages async dans le meme effet).
  useEffect(() => {
    if (!open) return
    setSkills([])
    if (!offer) return

    let cancelled = false
    getJobOfferSkillsAction(entityId, offer.id)
      .then((rows) => {
        if (cancelled) return
        setSkills(rows.map((r) => ({ id: r.skill_id, label: r.job_skills.label })))
      })
      .catch(() => {
        if (cancelled) return
        toast.error('Impossible de charger les aptitudes de cette offre.')
      })
    return () => {
      cancelled = true
    }
  }, [open, offer, entityId])

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

  // --- Step 1 Media Functions --- (motif repris de StepEssentials.tsx,
  // apps/platform/src/components/profile/product-create/steps/ - meme action
  // serveur d'upload, sans le recadrage, non demande ici).
  async function uploadOneMedia(file: File) {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)
    const id = crypto.randomUUID()
    const mediaType = isVideo ? ('video' as const) : ('image' as const)
    const previewUrl = URL.createObjectURL(file)
    let accepted = false

    // flushSync OBLIGATOIRE (motif StepEssentials.tsx) : sans lui, sous le
    // batching automatique de React 18, le updater ci-dessous n'est pas
    // execute avant le `if (!accepted)` suivant - `accepted` lirait donc
    // toujours sa valeur initiale `false`, revoquant previewUrl et
    // retournant avant meme l'appel a uploadProductMediaAction.
    flushSync(() => {
      setMedia((prev) => {
        if (prev.length >= MAX_JOB_OFFER_MEDIA) {
          toast.error(`Maximum ${MAX_JOB_OFFER_MEDIA} médias.`)
          return prev
        }
        if (isVideo && jobOfferMediaHasVideo(prev)) {
          toast.error('Une seule vidéo est autorisée.')
          return prev
        }
        accepted = true
        return [...prev, { id, type: mediaType, url: '', previewUrl, uploading: true }]
      })
    })

    if (!accepted) {
      URL.revokeObjectURL(previewUrl)
      return
    }

    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadProductMediaAction(fd)

      setMedia((prev) => {
        const item = prev.find((m) => m.id === id)
        if (!item) return prev

        if (!result.ok) {
          toast.error(result.error)
          if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
          return prev.filter((m) => m.id !== id)
        }

        return prev.map((m) =>
          m.id === id ? { ...m, url: result.url, type: result.type, uploading: false } : m,
        )
      })
    } catch {
      toast.error("Erreur réseau lors de l'envoi du média.")
      setMedia((prev) => {
        const item = prev.find((m) => m.id === id)
        if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
        return prev.filter((m) => m.id !== id)
      })
    }
  }

  async function handleMediaFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      await uploadOneMedia(file)
    }
  }

  function removeMedia(id: string) {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id)
      if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((m) => m.id !== id)
    })
  }

  function moveMedia(index: number, delta: -1 | 1) {
    setMedia((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
      return copy
    })
  }

  // --- Step 3 Block Functions ---
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
    setBlocks((prev) => [
      ...prev,
      { id: nextBlockId(), type: 'list', items: [{ id: nextBlockId(), value: '' }] },
    ])
  }

  function updateBlock(index: number, block: DraftBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)))
  }

  // Etape 1 "Vitrine" -> 2 "Informations" : titre + secteur requis (la zone
  // media reste optionnelle, cf. rapport phase 0). S'applique sans condition
  // de creation/edition (meme motif que les controles de handleNextFromInformations
  // ci-dessous) : une offre existante sans secteur (posee avant ce champ,
  // mission feat/job-offer-sector-ui) redemande le secteur des qu'on rouvre
  // son formulaire d'edition, pas seulement a la creation.
  const handleNextFromVitrine = () => {
    if (!title.trim()) {
      setError('Veuillez renseigner le titre du poste.')
      return
    }
    if (!sectorId) {
      setError("Veuillez sélectionner un secteur d'activité.")
      return
    }
    setError(null)
    setStep(2)
  }

  // Etape 2 "Informations" -> 3 "Compétences" : reprend telles quelles les
  // deux validations qui portaient auparavant sur l'unique etape 1 (le
  // numero d'etape suivant est desormais "Compétences", pas "Contenu" -
  // voir handleNextFromCompetences ci-dessous, Lot 4 Mission 2).
  const handleNextFromInformations = () => {
    if (locationType !== 'remote' && !locationText.trim()) {
      setError('Veuillez renseigner la localisation.')
      return
    }
    if (!compAmount || parseFloat(compAmount) <= 0) {
      setError('Veuillez renseigner le montant de la rémunération.')
      return
    }
    setError(null)
    setStep(3)
  }

  // Etape 3 "Compétences" -> 4 "Contenu" : aucune validation, les aptitudes
  // sont optionnelles (decision Killian, Lot 4 Mission 2) - le plafond
  // (MAX_JOB_OFFER_SKILLS) est deja applique dans JobSkillsPicker (input
  // desactive une fois atteint), pas besoin de le revalider ici.
  const handleNextFromCompetences = () => {
    setError(null)
    setStep(4)
  }

  // `explicitStatus` porte le choix Publier ('active') / Enregistrer
  // ('inactive') du footer a la creation. En edition, aucun bouton ne le
  // fournit : on retombe sur le `status` interne (jamais expose dans le
  // formulaire, voir useState ci-dessus) - comportement d'edition inchange.
  const handleSubmit = async (explicitStatus?: 'active' | 'inactive') => {
    setError(null)
    if (media.some((m) => m.uploading)) {
      setError("Patiente, un média est en cours d'envoi.")
      return
    }
    if (blocks.some((b) => b.type === 'image' && b.uploading)) {
      setError("Patiente, une image est en cours d'envoi.")
      return
    }

    let payloadBlocks: HistoryBlock[]
    try {
      payloadBlocks = serializeDraftBlocks(blocks)
    } catch (err: any) {
      setError(err.message || 'Blocs invalides.')
      return
    }

    // Verifiee uniquement a la creation : editer une offre existante ne doit
    // pas se remettre a exiger une date future pour un champ deja enregistre
    // (talent-actions.ts applique la meme regle cote serveur, source de
    // verite - ce controle client n'est qu'un retour immediat a la saisie).
    if (!isEditing && endDate) {
      const todayStr = new Date().toISOString().slice(0, 10)
      if (endDate <= todayStr) {
        setError('La date de fin doit être postérieure à aujourd’hui.')
        return
      }
    }

    const targetStatus = explicitStatus ?? status
    if (!isEditing) setPendingIntent(targetStatus === 'active' ? 'publish' : 'draft')

    startTransition(async () => {
      try {
        const payload = {
          title,
          sector_id: sectorId || null,
          contract_type: contractType,
          status: targetStatus as any,
          location_type: locationType as any,
          location_text: locationText || null,
          blocks: payloadBlocks,
          compensation_type: compType,
          compensation_amount: compAmount ? parseFloat(compAmount) : null,
          compensation_frequency: compFreq,
          apply_url: applyUrl || null,
          end_date: endDate || null,
          // Normalise a la soumission plutot qu'a chaque changement de type :
          // point de passage unique (impossible a contourner par un autre
          // chemin UI), et la coche n'est pas perdue si l'utilisateur bascule
          // cdi -> stage -> cdi avant de valider.
          is_cadre: CADRE_ELIGIBLE_TYPES.includes(contractType) ? isCadre : null,
          // Uploads en attente deja bloques par le garde media.some(uploading)
          // plus haut - ne reste ici que des medias avec une url definitive.
          media: media.map((m) => ({ url: m.url, type: m.type, alt_text: null })),
          // Chaque tag est deja resolu (find-or-create) au moment de son
          // ajout dans JobSkillsPicker - ne reste ici qu'a transmettre les
          // ids dans l'ordre d'affichage (display_order = position).
          skill_ids: skills.map((s) => s.id),
        }

        if (isEditing && offer) {
          await updateJobOfferAction(entityId, offer.id, payload)
        } else {
          await createJobOfferAction(entityId, payload)
          if (targetStatus === 'inactive') {
            toast.success(
              'Offre enregistrée hors ligne — retrouvable dans Pilotage > Recrutement pour la publier plus tard.',
            )
          } else {
            toast.success('Offre publiée.')
          }
        }
        // reason: 'success' - distingue d'une fermeture par annulation, voir
        // JobOfferDialogProps.onOpenChange. router.refresh() invalide le
        // rendu serveur de la route courante pour que la nouvelle offre
        // apparaisse sans rechargement manuel (meme motif que
        // ServiceClientProfile.tsx et les autres appelants de
        // router.refresh() apres une Server Action reussie).
        onOpenChange(false, 'success', { isCreate: !isEditing, status: targetStatus })
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue.')
      } finally {
        setPendingIntent(null)
      }
    })
  }

  return createPortal(
    <div className="pco-root" role="presentation">
      <button
        type="button"
        className="pco-root__backdrop"
        aria-label="Fermer"
        onClick={() => onOpenChange(false)}
      />
      <div className="pco__panel" role="dialog" aria-modal="true" aria-labelledby="pco-title">
        <header className="pco__header">
          <h2 id="pco-title" className="pco__title">
            {isEditing ? "Modifier l'offre" : 'Nouvelle offre'}
          </h2>
          <button
            type="button"
            className="pco__close"
            aria-label="Fermer"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="pco__steps" aria-label="Étapes de création">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`pco__step${step === n ? ' is-active' : ''}${step > n ? ' is-done' : ''}`}
            >
              <span className="pco__step-num">{n}</span>
              <span className="pco__step-label">
                {n === 1
                  ? 'Vitrine'
                  : n === 2
                    ? 'Informations'
                    : n === 3
                      ? 'Compétences'
                      : 'Contenu'}
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
            <section className="pco__stage">
              <div className="pco__field">
                <span className="pco__label">
                  Médias{' '}
                  <span className="pco__hint">
                    (jusqu&apos;à {MAX_JOB_OFFER_MEDIA}, dont {MAX_JOB_OFFER_VIDEOS} vidéo max — la
                    1<sup>re</sup> est la vignette)
                  </span>
                </span>
                {media.length > 0 ? (
                  <div className="pco__media-grid">
                    {media.map((m, i) => (
                      <div key={m.id} className="pco__media-item">
                        {m.type === 'video' ? (
                          <video src={m.previewUrl || m.url} muted playsInline />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.previewUrl || m.url} alt="" />
                        )}
                        {m.uploading ? (
                          <span className="pco__media-uploading">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </span>
                        ) : null}
                        {i === 0 && !m.uploading ? (
                          <span className="pco__media-cover">Vignette</span>
                        ) : m.type === 'video' ? (
                          <span className="pco__media-badge">Vidéo</span>
                        ) : null}
                        {!m.uploading ? (
                          <div className="pco__media-controls">
                            <button
                              type="button"
                              className="pco__mini-btn"
                              disabled={i === 0}
                              aria-label="Déplacer à gauche"
                              onClick={() => moveMedia(i, -1)}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="pco__mini-btn"
                              disabled={i === media.length - 1}
                              aria-label="Déplacer à droite"
                              onClick={() => moveMedia(i, 1)}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="pco__mini-btn pco__mini-btn--danger"
                              aria-label="Retirer"
                              onClick={() => removeMedia(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {canAddJobOfferMedia(media) ? (
                  <label className="pco__upload">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="pco__upload-input"
                      multiple
                      onChange={(e) => {
                        void handleMediaFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                    <span className="pco__upload-empty">
                      <ImagePlus className="h-5 w-5" />
                      Ajouter une photo ou vidéo
                    </span>
                  </label>
                ) : null}
              </div>

              <div className="pco__field">
                <label className="text-sm font-medium" htmlFor="job-offer-title">
                  Titre du poste *
                </label>
                <Input
                  id="job-offer-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ex: Développeur Fullstack React"
                />
              </div>

              <div className="pco__field">
                <label className="text-sm font-medium" htmlFor="job-offer-sector">
                  Secteur d&apos;activité *
                </label>
                <select
                  id="job-offer-sector"
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="block w-full rounded-field border border-neutral-200 bg-surface px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300"
                >
                  <option value="">Sélectionner un secteur</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type de contrat *</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as JobContractType)}
                    className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300"
                  >
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="interim">Intérim</option>
                    <option value="contrat_pro">Contrat pro</option>
                    <option value="apprentissage">Apprentissage</option>
                    <option value="stage">Stage</option>
                    <option value="mission">Mission / Freelance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lieu de travail *</label>
                  <select
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value as any)}
                    className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300"
                  >
                    <option value="onsite">Sur site</option>
                    <option value="remote">100% Télétravail</option>
                    <option value="hybrid">Hybride</option>
                  </select>
                </div>
              </div>

              {locationType !== 'remote' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Localisation *</label>
                  <Input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="Ex: Paris, France"
                    required
                  />
                </div>
              )}

              {CADRE_ELIGIBLE_TYPES.includes(contractType) && (
                <div className="flex items-center gap-2">
                  <input
                    id="job-offer-cadre"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={isCadre}
                    onChange={(e) => setIsCadre(e.target.checked)}
                  />
                  <label htmlFor="job-offer-cadre" className="text-sm font-medium">
                    Statut cadre
                  </label>
                </div>
              )}

              <div className="border-t border-neutral-100 pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3">Rémunération</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-500">Type</label>
                    <select
                      value={compType}
                      onChange={(e) => setCompType(e.target.value as JobCompType)}
                      className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300"
                    >
                      <option value="fixed">Fixe (€)</option>
                      <option value="percentage">Pourcentage (%)</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-neutral-500">Montant brut</label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={compAmount}
                          onChange={(e) => setCompAmount(e.target.value)}
                          className="pr-8"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500 text-sm">
                          {compType === 'percentage' ? '%' : '€'}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-neutral-500">Fréquence</label>
                      <select
                        value={compFreq}
                        onChange={(e) => setCompFreq(e.target.value as JobCompFreq)}
                        className="block w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 hover:border-neutral-300"
                      >
                        <option value="weekly">Par semaine</option>
                        <option value="monthly">Par mois</option>
                        <option value="mission">À la mission</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-2 space-y-2">
                <label className="text-sm font-medium">
                  Lien ou Email pour postuler (optionnel)
                </label>
                <Input
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="Ex: https://forms.gle/... ou jobs@entreprise.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date de fin (optionnel)</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          ) : step === 3 ? (
            <section className="pco__stage p-6">
              <span className="pco__label">
                Aptitudes demandées{' '}
                <span className="pco__hint">(optionnel, max {MAX_JOB_OFFER_SKILLS})</span>
              </span>
              <p className="mt-1 mb-4 text-sm text-neutral-500">
                Ce que vous attendez du candidat — permis, machines, logiciels... Il pourra les
                ajouter en un clic à son profil.
              </p>
              <JobSkillsPicker value={skills} onChange={setSkills} />
            </section>
          ) : (
            <section className="pco__stage p-6">
              <span className="pco__label">
                Contenu détaillé de l&apos;offre{' '}
                <span className="pco__hint">(max {HISTORY_MAX_BLOCKS} blocs)</span>
              </span>
              <div className="pco__blocks">
                {blocks.map((b, i) => (
                  <div key={b.id} className="pco__block-card">
                    <div className="pco__block-head">
                      <span className="pco__block-tag">
                        {b.type === 'text' ? 'Texte' : b.type === 'list' ? 'Liste' : 'Image'}
                      </span>
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
                                newItems[itemIndex] = {
                                  ...newItems[itemIndex],
                                  value: e.target.value,
                                }
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
                            updateBlock(i, {
                              ...b,
                              items: [...b.items, { id: nextBlockId(), value: '' }],
                            })
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
              <button
                type="button"
                className="pco__btn pco__btn--ghost"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </button>
            ) : step === 2 ? (
              <button type="button" className="pco__btn pco__btn--ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
            ) : step === 3 ? (
              <button type="button" className="pco__btn pco__btn--ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
            ) : (
              <button type="button" className="pco__btn pco__btn--ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
            )}
          </div>
          <div className="pco__actions-end flex items-center gap-3">
            {step === 1 ? (
              <button
                type="button"
                className="pco__btn pco__btn--primary"
                onClick={handleNextFromVitrine}
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            ) : step === 2 ? (
              <button
                type="button"
                className="pco__btn pco__btn--primary"
                onClick={handleNextFromInformations}
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                className="pco__btn pco__btn--primary"
                onClick={handleNextFromCompetences}
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            ) : isEditing ? (
              <button
                type="button"
                className="pco__btn pco__btn--primary"
                disabled={isPending}
                onClick={() => handleSubmit()}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <span>{isPending ? 'Enregistrement...' : "Mettre à jour l'offre"}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="pco__btn pco__btn--ghost"
                  disabled={isPending}
                  onClick={() => handleSubmit('inactive')}
                >
                  {pendingIntent === 'draft' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  <span>{pendingIntent === 'draft' ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
                <button
                  type="button"
                  className="pco__btn pco__btn--primary"
                  disabled={isPending}
                  onClick={() => handleSubmit('active')}
                >
                  {pendingIntent === 'publish' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  <span>{pendingIntent === 'publish' ? 'Publication...' : 'Publier'}</span>
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
