import { ImageIcon } from 'lucide-react'

type Props = {
  imageUrl: string | null | undefined
  alt?: string
  className?: string
}

export function ActiviteCatalogThumb({ imageUrl, alt = '', className = '' }: Props) {
  return (
    <div className={`activite-catalog-thumb${className ? ` ${className}` : ''}`} aria-hidden="true">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt} className="activite-catalog-thumb__img" />
      ) : (
        <span className="activite-catalog-thumb__fallback">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </div>
  )
}
