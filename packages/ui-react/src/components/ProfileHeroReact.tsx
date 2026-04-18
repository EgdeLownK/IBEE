import { MapPin, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PATTERN_FONT_SIZE = 48
const PATTERN_LINE_HEIGHT = 120
const PATTERN_LINES = Array.from({ length: 6 }, (_, i) => i)
const PATTERN_OFFSET = 240

type ProfileHeroReactProps = {
  displayName: string
  role: string | null
  location: string | null
  bio: string | null
  avatarUrl: string | null
  createdAt: string
}

export function ProfileHeroReact({
  displayName,
  role,
  location,
  bio,
  avatarUrl,
  createdAt,
}: ProfileHeroReactProps) {
  const formattedDate = format(new Date(createdAt), 'MMMM yyyy', { locale: fr })

  const nameText = `${displayName.toUpperCase()}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0`.repeat(20)

  return (
    <header>
      {/* Hero carrée pleine largeur */}
      <div
        className={`relative aspect-square w-full overflow-hidden ${
          !avatarUrl ? 'bg-accent-soft' : ''
        }`}
      >
        {/* Image utilisateur (uniquement si avatar défini) */}
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        )}

        {/* Pattern SVG de noms en briques (fallback uniquement) */}
        {!avatarUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <svg
              className="h-full w-full"
              viewBox="0 0 600 600"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              {PATTERN_LINES.map((i) => (
                <text
                  key={i}
                  x={i % 2 === 0 ? 0 : -PATTERN_OFFSET}
                  y={i * PATTERN_LINE_HEIGHT + PATTERN_FONT_SIZE}
                  fontSize={PATTERN_FONT_SIZE}
                  fontWeight="600"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fill="var(--color-accent)"
                  fillOpacity={0.2}
                >
                  {nameText}
                </text>
              ))}
            </svg>
          </div>
        )}

        {/* Overlay gradient bottom */}
        <div className="absolute inset-x-0 bottom-0 h-[15%] bg-gradient-to-b from-transparent to-white" />
      </div>

      {/* Bloc infos centré */}
      <div className="px-6 py-6 text-center sm:px-12 sm:py-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {displayName}
        </h1>

        {role && (
          <p className="mt-2 text-base font-semibold text-neutral-900 sm:text-lg">
            {role}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-400">
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="leading-none">{location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center">
              <Calendar className="h-4 w-4" />
            </span>
            <span className="leading-none">Inscrit en {formattedDate}</span>
          </span>
        </div>

        {bio && (
          <p className="mx-auto mt-6 max-w-prose text-sm leading-relaxed text-neutral-600 sm:text-base">
            {bio}
          </p>
        )}
      </div>
    </header>
  )
}
