import { ReactNode } from 'react'

interface Props {
  /** Tailwind aspect class, e.g. 'aspect-[3/4]', 'aspect-[4/3]', 'aspect-square'. */
  aspect?: string
  /** Lucide icon (or other svg) shown centered. */
  icon?: ReactNode
  /** Top-left stamp text. Defaults to 'doen.' */
  stampLabel?: string
  /** Stamp background color. Defaults to flame orange. */
  stampColor?: string
  /** Big mono label above the description. */
  caption?: string
  /** Body instruction text. */
  description?: string
  /** Optional ratio hint, e.g. '3 : 4'. */
  ratio?: string
  /** Bottom strip left text. */
  footerLeft?: string
  /** Bottom strip right text, e.g. 'Nr. 001'. */
  footerRight?: string
  /** Light = cream/sand bg. Dark = petrol bg. */
  tone?: 'cream' | 'sand' | 'dark'
  className?: string
}

/**
 * Unique editorial photo-placeholder, newspaper-print aesthetic:
 *   - halftone dot screen background
 *   - corner trim-marks (like print registration)
 *   - paper grain overlay
 *   - centered lucide icon (kept across all placeholders)
 *   - stamp + caption + serial — like a newspaper photo credit
 *
 * Swap with a real <Image src="..." fill className="object-cover" /> when the
 * Nano Banana 2 render is ready. Keep the lucide icon in the real photo
 * caption strip if you want to preserve the icon-association.
 */
export default function EditorialPhotoPlaceholder({
  aspect = 'aspect-[3/4]',
  icon,
  stampLabel = 'doen.',
  stampColor = '#F15025',
  caption = 'Foto · vervang me',
  description,
  ratio,
  footerLeft = 'In de werkplaats',
  footerRight = 'Nr. 001',
  tone = 'cream',
  className = '',
}: Props) {
  const dark = tone === 'dark'

  const bg = dark ? '#143F46' : tone === 'sand' ? '#DCD7CC' : '#E4DFD6'
  const iconStroke = dark ? 'rgba(255,255,255,0.55)' : '#1A535C'
  const captionFlame = '#F15025'
  const muted = dark ? 'rgba(255,255,255,0.65)' : '#6B6B66'
  const faint = dark ? 'rgba(255,255,255,0.35)' : '#9B9B95'
  const corner = dark ? 'rgba(255,255,255,0.35)' : 'rgba(26,83,92,0.35)'
  const dotColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,83,92,0.10)'
  const captionStripBg = dark ? 'rgba(0,0,0,0.35)' : 'rgba(20,40,40,0.78)'

  // Halftone dot screen — encoded as data URI svg for portability
  const halftone = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><circle cx='2' cy='2' r='0.9' fill='${encodeURIComponent(dotColor)}'/></svg>")`

  const paperGrain = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>")`

  return (
    <div
      className={`relative w-full overflow-hidden ${aspect} ${className}`}
      style={{
        backgroundColor: bg,
        boxShadow: dark
          ? '0 24px 60px -20px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.18)'
          : '0 24px 60px -20px rgba(20,40,40,0.22), 0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* Halftone dot screen */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: halftone, backgroundSize: '6px 6px', opacity: 0.9 }}
      />
      {/* Paper grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{ backgroundImage: paperGrain, opacity: dark ? 0.18 : 0.10 }}
      />

      {/* Corner trim marks */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* top-left */}
        <line x1="0" y1="3" x2="6" y2="3" stroke={corner} strokeWidth="0.4" />
        <line x1="3" y1="0" x2="3" y2="6" stroke={corner} strokeWidth="0.4" />
        {/* top-right */}
        <line x1="100" y1="3" x2="94" y2="3" stroke={corner} strokeWidth="0.4" />
        <line x1="97" y1="0" x2="97" y2="6" stroke={corner} strokeWidth="0.4" />
        {/* bottom-left */}
        <line x1="0" y1="97" x2="6" y2="97" stroke={corner} strokeWidth="0.4" />
        <line x1="3" y1="94" x2="3" y2="100" stroke={corner} strokeWidth="0.4" />
        {/* bottom-right */}
        <line x1="100" y1="97" x2="94" y2="97" stroke={corner} strokeWidth="0.4" />
        <line x1="97" y1="94" x2="97" y2="100" stroke={corner} strokeWidth="0.4" />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {icon && (
          <div
            className="mb-5 opacity-60"
            style={{ color: iconStroke }}
          >
            {icon}
          </div>
        )}
        {caption && (
          <p
            className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
            style={{ color: dark ? 'rgba(255,255,255,0.75)' : '#1A535C' }}
          >
            {caption}
          </p>
        )}
        {description && (
          <p
            className="text-[12px] leading-[1.55] max-w-[220px] font-medium"
            style={{ color: muted }}
          >
            {description}
          </p>
        )}
        {ratio && (
          <p
            className="font-mono text-[9px] mt-4 tracking-[0.15em] uppercase"
            style={{ color: faint }}
          >
            {ratio}
          </p>
        )}
      </div>

      {/* Top-left stamp */}
      {stampLabel && (
        <div
          className="absolute top-3 left-3 px-2.5 py-1"
          style={{ backgroundColor: stampColor }}
        >
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">
            {stampLabel}
          </span>
        </div>
      )}

      {/* Bottom caption strip */}
      {(footerLeft || footerRight) && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: captionStripBg, backdropFilter: 'blur(4px)' }}
        >
          {footerLeft && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/85">
              {footerLeft}
            </span>
          )}
          {footerRight && (
            <span className="font-mono text-[9px] text-white/55 tracking-[0.15em]">
              {footerRight}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
