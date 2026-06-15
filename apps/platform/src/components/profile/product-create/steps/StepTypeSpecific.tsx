'use client'

import { useRef } from 'react'
import { Download, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PHYSICAL_CONDITIONS } from '@ibee/shared'
import {
  listEntityFilesAction,
} from '@/lib/entity-file-actions'
import { DRIVE_MAX_FILE_MB } from '@/lib/drive-file-policy'
import { uploadDriveFile } from '@/lib/drive-upload-client'
import type { ProductCreateFormState } from '../types'
import { formatFileSize, nextId } from '../utils'

type Props = {
  form: ProductCreateFormState
  updateForm: (fn: (prev: ProductCreateFormState) => ProductCreateFormState) => void
  onChange: (patch: Partial<ProductCreateFormState>) => void
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  very_good: 'Très bon état',
  good: 'Bon état',
  acceptable: 'Correct',
}

export function StepTypeSpecific({ form, updateForm, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function err(field: string) {
    return form.fieldErrors[field]
  }

  function variantErr(index: number, suffix = 'attributes') {
    return form.fieldErrors[`variants_${index}_${suffix}`]
  }

  async function loadEntityFiles() {
    const result = await listEntityFilesAction()
    if (result.ok) onChange({ entityFiles: result.files })
    else toast.error(result.error)
  }

  async function handleFileUpload(file: File) {
    updateForm((prev) => ({ ...prev, digitalFileUploading: true }))
    try {
      const result = await uploadDriveFile(file)
      if (result.ok) {
        updateForm((prev) => ({
          ...prev,
          digitalFileUploading: false,
          digitalFileId: result.file.id,
          digitalFile: result.file,
          entityFiles: [result.file, ...prev.entityFiles.filter((f) => f.id !== result.file.id)],
        }))
      } else {
        updateForm((prev) => ({ ...prev, digitalFileUploading: false }))
        toast.error(result.error)
        onChange({ fieldErrors: { ...form.fieldErrors, digital_file_id: result.error } })
      }
    } catch {
      updateForm((prev) => ({ ...prev, digitalFileUploading: false }))
      toast.error('Erreur lors de la préparation du fichier.')
    }
  }

  function addVariant() {
    if (form.variants.length >= 20) return
    onChange({
      variants: [
        ...form.variants,
        { id: nextId('v'), pairs: [{ key: '', value: '' }], sku: '', price: '', stock: '' },
      ],
    })
  }

  function addDetail() {
    if (form.customDetails.length >= 8) return
    onChange({ customDetails: [...form.customDetails, { label: '', value: '' }] })
  }

  if (form.type === 'digital') {
    return (
      <section className="pco__stage">
        <div className="pco__field">
          <span className="pco__label">
            Fichier livré <span className="pco__req">*</span>
          </span>
          {form.digitalFile ? (
            <div className="pco__file-selected">
              <Download className="h-4 w-4 shrink-0" />
              <span className="pco__file-selected-name">{form.digitalFile.name}</span>
              <span className="pco__file-selected-size">
                {formatFileSize(form.digitalFile.size_bytes)}
              </span>
              <button
                type="button"
                className="pco__file-remove"
                aria-label="Retirer le fichier"
                onClick={() => onChange({ digitalFileId: null, digitalFile: null })}
              >
                ×
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="pco__add-btn"
            disabled={form.digitalFileUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {form.digitalFileUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {form.digitalFile ? 'Changer de fichier' : 'Téléverser un fichier'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFileUpload(f)
              e.target.value = ''
            }}
          />
          <p className="pco__hint-block">
            Jusqu&apos;à {DRIVE_MAX_FILE_MB} Mo. Vidéos lourdes envoyées en direct puis compressées côté
            serveur. Stocké en privé — livré à l&apos;acheteur après l&apos;achat.
          </p>
          {err('digital_file_id') ? <p className="pco__error">{err('digital_file_id')}</p> : null}
        </div>

        <div className="pco__field">
          <span className="pco__label">
            Mes fichiers{' '}
            <span className="pco__hint">(réutiliser un fichier déjà envoyé)</span>
          </span>
          {form.entityFiles.length === 0 ? (
            <button type="button" className="pco__add-btn pco__add-btn--ghost" onClick={() => void loadEntityFiles()}>
              Charger mes fichiers
            </button>
          ) : (
            <div className="pco__myfiles-list">
              {form.entityFiles.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`pco__file-item${form.digitalFileId === f.id ? ' is-selected' : ''}`}
                  onClick={() => onChange({ digitalFileId: f.id, digitalFile: f })}
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="pco__file-item-name">{f.name}</span>
                  <span className="pco__file-item-meta">{formatFileSize(f.size_bytes)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pco__field">
          <span className="pco__label">
            Détails personnalisés{' '}
            <span className="pco__hint">(max 8 — ex : Licence, Mises à jour…)</span>{' '}
            <span className="pco__counter">{form.customDetails.length}/8</span>
          </span>
          <div className="pco__attr-pairs">
            {form.customDetails.map((d, i) => (
              <div key={i} className="pco__pair-row">
                <input
                  type="text"
                  maxLength={40}
                  className="pco__input"
                  placeholder="Libellé"
                  value={d.label}
                  onChange={(e) => {
                    const copy = [...form.customDetails]
                    copy[i] = { ...copy[i]!, label: e.target.value }
                    onChange({ customDetails: copy })
                  }}
                />
                <input
                  type="text"
                  maxLength={100}
                  className="pco__input"
                  placeholder="Valeur"
                  value={d.value}
                  onChange={(e) => {
                    const copy = [...form.customDetails]
                    copy[i] = { ...copy[i]!, value: e.target.value }
                    onChange({ customDetails: copy })
                  }}
                />
                <button
                  type="button"
                  className="pco__icon-btn"
                  aria-label="Supprimer"
                  onClick={() =>
                    onChange({ customDetails: form.customDetails.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {form.customDetails.length < 8 ? (
            <button type="button" className="pco__add-btn" onClick={addDetail}>
              <Plus className="h-4 w-4" /> Ajouter un détail
            </button>
          ) : null}
          {err('custom_details') ? <p className="pco__error">{err('custom_details')}</p> : null}
        </div>
      </section>
    )
  }

  return (
    <section className="pco__stage">
      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="pco-stock">
            Quantité en stock
          </label>
          <input
            id="pco-stock"
            type="number"
            min={0}
            step={1}
            className="pco__input"
            value={form.physicalStockQuantity}
            onChange={(e) => onChange({ physicalStockQuantity: e.target.value })}
          />
          {err('physical_stock_quantity') ? (
            <p className="pco__error">{err('physical_stock_quantity')}</p>
          ) : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="pco-condition">
            État
          </label>
          <select
            id="pco-condition"
            className="pco__input"
            value={form.physicalCondition}
            onChange={(e) =>
              onChange({
                physicalCondition: e.target.value as ProductCreateFormState['physicalCondition'],
              })
            }
          >
            {PHYSICAL_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          {err('physical_condition') ? <p className="pco__error">{err('physical_condition')}</p> : null}
        </div>
      </div>

      <div className="pco__field">
        <span className="pco__label">
          Variantes <span className="pco__hint">(max 20, optionnel)</span>
        </span>
        <div className="pco__variants">
          {form.variants.map((v, vi) => (
            <div key={v.id} className="pco__variant-card">
              <div className="pco__variant-head">
                <span className="pco__variant-title">Variante {vi + 1}</span>
                <button
                  type="button"
                  className="pco__icon-btn"
                  aria-label="Supprimer la variante"
                  onClick={() =>
                    onChange({ variants: form.variants.filter((x) => x.id !== v.id) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {v.pairs.map((p, pi) => (
                <div key={pi} className="pco__pair-row">
                  <input
                    type="text"
                    maxLength={40}
                    className="pco__input"
                    placeholder="Attribut (ex : Taille)"
                    value={p.key}
                    onChange={(e) => {
                      const variants = form.variants.map((x) => {
                        if (x.id !== v.id) return x
                        const pairs = [...x.pairs]
                        pairs[pi] = { ...pairs[pi]!, key: e.target.value }
                        return { ...x, pairs }
                      })
                      onChange({ variants })
                    }}
                  />
                  <input
                    type="text"
                    maxLength={40}
                    className="pco__input"
                    placeholder="Valeur (ex : M)"
                    value={p.value}
                    onChange={(e) => {
                      const variants = form.variants.map((x) => {
                        if (x.id !== v.id) return x
                        const pairs = [...x.pairs]
                        pairs[pi] = { ...pairs[pi]!, value: e.target.value }
                        return { ...x, pairs }
                      })
                      onChange({ variants })
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="pco__add-btn pco__add-btn--inline"
                onClick={() => {
                  const variants = form.variants.map((x) =>
                    x.id === v.id ? { ...x, pairs: [...x.pairs, { key: '', value: '' }] } : x
                  )
                  onChange({ variants })
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Attribut
              </button>
              <div className="pco__row">
                <input
                  type="text"
                  maxLength={80}
                  className="pco__input"
                  placeholder="SKU (optionnel)"
                  value={v.sku}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, sku: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pco__input"
                  placeholder="Prix variante €"
                  value={v.price}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, price: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="pco__input"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, stock: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
              </div>
              {variantErr(vi) ? <p className="pco__error">{variantErr(vi)}</p> : null}
            </div>
          ))}
        </div>
        {form.variants.length < 20 ? (
          <button type="button" className="pco__add-btn" onClick={addVariant}>
            <Plus className="h-4 w-4" /> Ajouter une variante
          </button>
        ) : null}
        {err('variants') ? <p className="pco__error">{err('variants')}</p> : null}
      </div>
    </section>
  )
}
