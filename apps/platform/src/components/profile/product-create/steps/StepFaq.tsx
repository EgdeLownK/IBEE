'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { ProductCreateFormState } from '../types'

type Props = {
  form: ProductCreateFormState
  onChange: (patch: Partial<ProductCreateFormState>) => void
}

export function StepFaq({ form, onChange }: Props) {
  function err(field: string) {
    return form.fieldErrors[field]
  }

  function addFaq() {
    if (form.faq.length >= 10) return
    onChange({ faq: [...form.faq, { question: '', answer: '' }] })
  }

  function updateFaq(index: number, field: 'question' | 'answer', value: string) {
    const copy = [...form.faq]
    copy[index] = { ...copy[index]!, [field]: value }
    onChange({ faq: copy })
  }

  function removeFaq(index: number) {
    const copy = [...form.faq]
    copy.splice(index, 1)
    onChange({ faq: copy })
  }

  return (
    <section className="pco__stage">
      <div className="pco__field">
        <label className="pco__label">
          Questions Fréquentes (FAQ) <span className="pco__hint">(max 10)</span>
        </label>
        
        <div className="flex flex-col gap-4 mt-2">
          {form.faq.map((item, index) => (
            <div key={index} className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium">Question {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeFaq(index)}
                  className="pco__icon-btn"
                  aria-label="Supprimer la question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  maxLength={100}
                  className="pco__input"
                  placeholder="Ex: Comment entretenir ce produit ?"
                  value={item.question}
                  onChange={(e) => updateFaq(index, 'question', e.target.value)}
                />
                <textarea
                  maxLength={1000}
                  rows={3}
                  className="pco__input"
                  placeholder="Ex: Lavage à la main recommandé..."
                  value={item.answer}
                  onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                />
              </div>
            </div>
          ))}
          
          {form.faq.length < 10 && (
            <button
              type="button"
              className="pco__add-btn"
              onClick={addFaq}
            >
              <Plus className="h-4 w-4" /> Ajouter une question
            </button>
          )}
        </div>
        
        {err('faq') && <p className="pco__error mt-2">{err('faq')}</p>}
      </div>

    </section>
  )
}
