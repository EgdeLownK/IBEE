import { ChevronDown } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  faq: FaqItem[]
  emptyLabel?: string
}

export function ProductFaq({ faq, emptyLabel = 'Pas encore de FAQ pour ce produit.' }: Props) {
  const faqSchema =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }
      : null

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <section id="faq" className="sec">
        <h2 className="sec-h mt-0 mb-3">Questions fréquentes</h2>

        {faq.length > 0 ? (
          <div className="flex flex-col gap-2">
            {faq.map((item, i) => (
              <details key={i} className="faq">
                <summary>
                  {item.question}
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                </summary>
                <p className="whitespace-pre-wrap">{item.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="faq-empty-card">
            <p>{emptyLabel}</p>
          </div>
        )}
      </section>
    </>
  )
}
