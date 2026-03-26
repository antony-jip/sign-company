import { Calendar } from 'lucide-react'

interface PortaalHeaderProps {
  bedrijfNaam: string
  logoUrl?: string
  klantNaam?: string
  verlooptOp: string
  projectNaam?: string
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function PortaalHeader({ bedrijfNaam, logoUrl, verlooptOp, projectNaam }: PortaalHeaderProps) {
  return (
    <header
      className="flex-shrink-0 relative overflow-hidden"
      style={{ backgroundColor: '#1A535C' }}
    >
      {/* Decorative dot pattern */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" className="opacity-[0.08]">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2" fill="#F15025" />
              <circle cx="16" cy="16" r="1.5" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={bedrijfNaam}
              className="h-10 w-auto max-w-[160px] object-contain brightness-0 invert"
            />
          ) : (
            <span
              className="text-lg font-extrabold text-white tracking-tight"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {bedrijfNaam}
            </span>
          )}
          {projectNaam && (
            <span className="hidden sm:inline text-white/60 text-sm truncate">
              {projectNaam}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-white/50 flex-shrink-0" style={{ fontSize: 11 }}>
          <Calendar className="w-3.5 h-3.5" />
          <span style={{ fontFamily: "'DM Mono', monospace" }}>
            Geldig tot {formatDate(verlooptOp)}
          </span>
        </div>
      </div>
    </header>
  )
}
