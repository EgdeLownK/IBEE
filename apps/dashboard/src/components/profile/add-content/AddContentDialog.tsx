'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Image as ImageIcon,
  Loader2,
  Newspaper,
  Plus,
  ShoppingBag,
  Smile,
  Trash2,
  Video,
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createPublicationAction,
  uploadPublicationMediaAction,
} from '@/app/dashboard/site/publication-actions'

const EMOJIS = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '🤔', '👍', '👏', '🎉', '🔥', '❤️', '💯', '🙌', '✨', '💪']
const MAX_VIDEO_SECONDS = 300
const MAX_MEDIA = 10

type MediaItem = {
  id: string
  type: 'image' | 'video'
  url: string
  previewUrl: string
  uploading: boolean
  width?: number | null
  height?: number | null
}

type ToolbarItem = {
  type: string
  label: string
  mode: 'composer' | 'overlay'
  Icon: typeof Newspaper
}

interface Props {
  open: boolean
  displayName: string
  avatarUrl: string | null
  activeSectionTypes: Set<string>
  webEditUrl: string
  onClose: () => void
  onOpenHistory?: () => void
  onOpenProduct?: () => void
  onOpenService?: () => void
  onOpenEvent?: () => void
  onPublished: (publication: {
    id: string
    title: string
    slug: string
    content: string | null
    created_at: string
    published_at: string | null
    status?: string
    publication_media?: unknown[]
  }) => void
}

let mediaUid = 0
function nextMediaId() {
  mediaUid += 1
  return `m${mediaUid}`
}

export function AddContentDialog({
  open,
  displayName,
  avatarUrl,
  activeSectionTypes,
  webEditUrl,
  onClose,
  onOpenHistory,
  onOpenProduct,
  onOpenService,
  onOpenEvent,
  onPublished,
}: Props) {
  const hasNews = activeSectionTypes.has('news')
  const defaultType = hasNews ? 'news' : 'shop'

  const toolbarItems = useMemo((): ToolbarItem[] => {
    const all: ToolbarItem[] = [
      { type: 'news', label: 'News', mode: 'composer', Icon: Newspaper },
      { type: 'shop', label: 'Produit', mode: 'overlay', Icon: ShoppingBag },
      { type: 'appointments', label: 'Service', mode: 'overlay', Icon: CalendarDays },
      { type: 'events', label: 'Event', mode: 'overlay', Icon: Zap },
      { type: 'history', label: 'Histoire', mode: 'overlay', Icon: BookOpen },
    ]
    return all.filter((item) => activeSectionTypes.has(item.type))
  }, [activeSectionTypes])

  const [activeType, setActiveType] = useState(defaultType)
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [error, setError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  const reset = useCallback(() => {
    setContent('')
    setMedia([])
    setPollEnabled(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setError('')
    setEmojiOpen(false)
    setActiveType(hasNews ? 'news' : toolbarItems[0]?.type ?? 'news')
  }, [hasNews, toolbarItems])

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

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

  function getPollData() {
    if (!pollEnabled) return null
    const question = pollQuestion.trim()
    const options = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (!question || options.length < 2) return null
    return { question, options }
  }

  const canPublish =
    hasNews &&
    activeType === 'news' &&
    !pending &&
    !media.some((m) => m.uploading) &&
    !!(content.trim() || media.some((m) => m.url) || getPollData())

  function readVideoMeta(file: File): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => {
        const duration = v.duration
        URL.revokeObjectURL(url)
        if (duration > MAX_VIDEO_SECONDS) {
          resolve({
            ok: false,
            error: `La vidéo ne doit pas dépasser 5 minutes (${Math.round(duration)} s détectées).`,
          })
        } else {
          resolve({ ok: true })
        }
      }
      v.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ ok: false, error: 'Impossible de lire cette vidéo.' })
      }
      v.src = url
    })
  }

  function readImageMeta(file: File): Promise<{ width: number | null; height: number | null }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ width: null, height: null })
      }
      img.src = url
    })
  }

  async function uploadFile(file: File, type: 'image' | 'video', width?: number | null, height?: number | null) {
    if (media.length >= MAX_MEDIA) {
      setError(`Maximum ${MAX_MEDIA} médias par publication.`)
      return
    }
    const id = nextMediaId()
    const previewUrl = URL.createObjectURL(file)
    setMedia((prev) => [
      ...prev,
      { id, type, url: '', previewUrl, uploading: true, width, height },
    ])
    setError('')

    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPublicationMediaAction(fd)

    setMedia((prev) => {
      if (!result.ok) {
        setError(result.error)
        return prev.filter((m) => m.id !== id)
      }
      return prev.map((m) =>
        m.id === id ? { ...m, url: result.url, type: result.type, uploading: false } : m
      )
    })
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      if (media.length >= MAX_MEDIA) break
      const meta = await readImageMeta(file)
      await uploadFile(file, 'image', meta.width, meta.height)
    }
  }

  async function handleVideoFile(file: File | null) {
    if (!file) return
    const check = await readVideoMeta(file)
    if (!check.ok) {
      setError(check.error ?? 'Vidéo invalide.')
      return
    }
    await uploadFile(file, 'video')
  }

  function removeMedia(id: string) {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id)
      if (item?.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(item.previewUrl)
        } catch {
          /* ignore */
        }
      }
      return prev.filter((m) => m.id !== id)
    })
  }

  function moveMedia(id: string, delta: number) {
    setMedia((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx < 0) return prev
      const target = idx + delta
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target]!, copy[idx]!]
      return copy
    })
  }

  function handleToolbarClick(item: ToolbarItem) {
    if (item.mode === 'composer' || item.type === 'news') {
      setActiveType('news')
      return
    }
    if (item.type === 'history' && onOpenHistory) {
      onClose()
      onOpenHistory()
      return
    }
    if (item.type === 'shop' && onOpenProduct) {
      onClose()
      onOpenProduct()
      return
    }
    if (item.type === 'appointments' && onOpenService) {
      onClose()
      onOpenService()
      return
    }
    if (item.type === 'events' && onOpenEvent) {
      onClose()
      onOpenEvent()
      return
    }
    onClose()
    toast.info(`${item.label} — ouvre l'édition complète sur le profil web`, {
      action: {
        label: 'Ouvrir',
        onClick: () => window.open(webEditUrl, '_blank'),
      },
    })
  }

  function handlePublish() {
    if (!canPublish) return
    const poll = getPollData()
    if (pollEnabled && !poll) {
      setError('Complète la question et au moins 2 options du sondage.')
      return
    }

    startTransition(async () => {
      const result = await createPublicationAction({
        content,
        poll,
        media: media
          .filter((m) => m.url && !m.uploading)
          .map((m) => ({
            url: m.url,
            type: m.type,
            width: m.width,
            height: m.height,
          })),
      })
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      onPublished({
        id: result.publication.id,
        title: result.publication.title,
        slug: result.publication.slug,
        content: result.publication.content,
        created_at: result.publication.created_at,
        published_at: result.publication.published_at,
        status: result.publication.status,
        publication_media: result.publication.publication_media ?? [],
      })
      toast.success('Publication publiée')
      onClose()
    })
  }

  if (!open || typeof document === 'undefined') return null

  const isNews = activeType === 'news' && hasNews

  return createPortal(
    <div className="add-content" role="presentation">
      <button type="button" className="add-content__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="add-content__panel" role="dialog" aria-modal="true" aria-labelledby="add-content-title">
        <header className="add-content__head">
          <div className="add-content__user">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="add-content__avatar" width={44} height={44} />
            ) : (
              <span className="add-content__avatar add-content__avatar--initials" aria-hidden="true">
                {initials}
              </span>
            )}
            <div className="add-content__user-text">
              <p className="add-content__name">{displayName}</p>
              <p id="add-content-title" className="add-content__subtitle">
                Ajouter du contenu
              </p>
            </div>
          </div>
          <button type="button" className="add-content__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="add-content__body">
          {toolbarItems.length === 0 ? (
            <p className="add-content__prompt add-content__prompt--muted">
              Aucun menu actif pour publier du contenu.
              <span className="add-content__hint">
                Utilise l&apos;onglet <strong>+</strong> pour activer Shop, Service, Event…
              </span>
            </p>
          ) : (
            <>
              {isNews && (
                <div className="add-content__composer">
                  <textarea
                    className="add-content__textarea"
                    rows={5}
                    maxLength={10000}
                    placeholder="Quelle actu souhaitez-vous partager ?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />

                  {media.length > 0 && (
                    <div className="add-content__media">
                      {media.map((item, index) => (
                        <div key={item.id} className="add-content__media-item">
                          <div className="add-content__media-thumb">
                            {item.type === 'video' ? (
                              <>
                                <video src={item.previewUrl || item.url} muted playsInline preload="metadata" />
                                <span className="add-content__media-badge">▶</span>
                              </>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.previewUrl || item.url} alt="" />
                            )}
                            {item.uploading && (
                              <span className="add-content__media-loading">Envoi…</span>
                            )}
                            {media.length > 1 && (
                              <div className="add-content__media-reorder">
                                <button
                                  type="button"
                                  className="add-content__media-move"
                                  disabled={index === 0 || item.uploading}
                                  aria-label="Déplacer avant"
                                  onClick={() => moveMedia(item.id, -1)}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className="add-content__media-move"
                                  disabled={index === media.length - 1 || item.uploading}
                                  aria-label="Déplacer après"
                                  onClick={() => moveMedia(item.id, 1)}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              className="add-content__media-remove"
                              aria-label="Retirer"
                              onClick={() => removeMedia(item.id)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {pollEnabled && (
                    <div className="add-content__poll">
                      <div className="add-content__poll-head">
                        <span className="add-content__poll-label">Sondage</span>
                        <button
                          type="button"
                          className="add-content__poll-remove"
                          aria-label="Retirer le sondage"
                          onClick={() => {
                            setPollEnabled(false)
                            setPollQuestion('')
                            setPollOptions(['', ''])
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        className="add-content__poll-q"
                        maxLength={200}
                        placeholder="Ta question…"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                      />
                      <div className="add-content__poll-options">
                        {pollOptions.map((opt, i) => (
                          <input
                            key={i}
                            type="text"
                            className="add-content__poll-opt"
                            maxLength={80}
                            placeholder={`Option ${i + 1}`}
                            value={opt}
                            onChange={(e) =>
                              setPollOptions((prev) =>
                                prev.map((o, j) => (j === i ? e.target.value : o))
                              )
                            }
                          />
                        ))}
                      </div>
                      {pollOptions.length < 4 && (
                        <button
                          type="button"
                          className="add-content__poll-add"
                          onClick={() => setPollOptions((prev) => [...prev, ''])}
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter une option
                        </button>
                      )}
                    </div>
                  )}

                  {error && <p className="add-content__error">{error}</p>}
                </div>
              )}

              {!isNews && (
                <p className="add-content__prompt">Choisis un type ci-dessous pour continuer.</p>
              )}
            </>
          )}
        </div>

        {toolbarItems.length > 0 && (
          <footer className="add-content__foot">
            {isNews && (
              <div className="add-content__composer-bar">
                <div className="add-content__composer-tools">
                  <div className="add-content__emoji-wrap">
                    <button
                      type="button"
                      className="add-content__icon-btn"
                      aria-label="Ajouter un emoji"
                      onClick={() => setEmojiOpen((v) => !v)}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {emojiOpen && (
                      <div className="add-content__emoji-pop">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="add-content__emoji-item"
                            onClick={() => {
                              setContent((c) => c + e)
                              setEmojiOpen(false)
                            }}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="add-content__icon-btn"
                    aria-label="Ajouter une image"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="add-content__icon-btn"
                    aria-label="Ajouter une vidéo"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="add-content__icon-btn"
                    aria-label="Ajouter un sondage"
                    onClick={() => setPollEnabled(true)}
                  >
                    <BarChart3 className="h-5 w-5" />
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="add-content__file"
                    multiple
                    onChange={(e) => {
                      void handleImageFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    className="add-content__file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleVideoFile(f)
                      e.target.value = ''
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="add-content__publish"
                  disabled={!canPublish}
                  onClick={handlePublish}
                >
                  {pending && <Loader2 className="add-content__spinner h-4 w-4 animate-spin" />}
                  <span>{pending ? '' : 'Publier'}</span>
                </button>
              </div>
            )}

            <div className="add-content__toolbar" role="toolbar" aria-label="Types de contenu">
              {toolbarItems.map((item) => {
                const Icon = item.Icon
                const isActive = activeType === item.type || (item.type === 'news' && isNews)
                return (
                  <button
                    key={item.type}
                    type="button"
                    className={`add-content__tool${isActive ? ' is-active' : ''}`}
                    title={item.label}
                    onClick={() => handleToolbarClick(item)}
                  >
                    <span className="add-content__tool-icon">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="add-content__tool-label">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}
