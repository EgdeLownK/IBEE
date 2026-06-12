import type { DetailContentBlock } from '@/lib/entity-content-blocks'

type EntityKind = 'product' | 'service' | 'event'

const SECTION_TITLES: Record<EntityKind, string> = {
  product: 'Plus de détails sur ce produit',
  service: 'Plus de détails sur ce service',
  event: 'Plus de détails sur cet événement',
}

interface Props {
  entityKind: EntityKind
  contentBlocks?: DetailContentBlock[]
  bulletPoints?: string[]
  fallbackText?: string | null
}

export function EntityMoreDetails({
  entityKind,
  contentBlocks = [],
  bulletPoints = [],
  fallbackText = null,
}: Props) {
  const hasBlocks = contentBlocks.length > 0
  const hasBullets = bulletPoints.length > 0
  const fallback = fallbackText?.trim() ?? ''
  const hasFallback = fallback.length > 0
  const hasContent = hasBlocks || hasBullets || hasFallback

  if (!hasContent) return null

  return (
    <section className="emd">
      <h2 className="emd__title">{SECTION_TITLES[entityKind]}</h2>

      {hasBullets && (
        <ul className="emd__bullets">
          {bulletPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      )}

      <div className="emd__body">
        {hasBlocks
          ? contentBlocks.map((block, i) =>
              block.type === 'text' ? (
                <p key={i} className="emd__text">
                  {block.content}
                </p>
              ) : (
                <figure key={i} className="emd__figure">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={block.url} alt={block.alt ?? ''} className="emd__img" loading="lazy" />
                </figure>
              )
            )
          : hasFallback && <p className="emd__text">{fallback}</p>}
      </div>
    </section>
  )
}
