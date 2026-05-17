/**
 * GevelMockup — SVG illustratie van een Nederlandse gevel met
 * een fysieke doen.-sign erop. Brengt het merk in de echte wereld
 * (signmakers maken signs — laat zien wat het EINDPRODUCT is).
 * Pure SVG, geen externe assets, schaalbaar.
 */
export default function GevelMockup({
  width = 320,
  className = '',
}: {
  width?: number
  className?: string
}) {
  return (
    <svg
      aria-label="Mockup van een Nederlandse gevel met doen. signage"
      viewBox="0 0 320 380"
      width={width}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Petrol gradient for sign panel (slight depth) */}
        <linearGradient id="gm-sign" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1A535C" />
          <stop offset="100%" stopColor="#143F46" />
        </linearGradient>
        {/* Brick wall pattern */}
        <pattern id="gm-brick" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="#D4C9B8" />
          <line x1="0" y1="10" x2="40" y2="10" stroke="#B8AC97" strokeWidth="0.6" />
          <line x1="20" y1="0" x2="20" y2="10" stroke="#B8AC97" strokeWidth="0.6" />
          <line x1="0" y1="10" x2="0" y2="20" stroke="#B8AC97" strokeWidth="0.6" />
          <line x1="40" y1="10" x2="40" y2="20" stroke="#B8AC97" strokeWidth="0.6" />
        </pattern>
        {/* Window glass */}
        <linearGradient id="gm-glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8E1D0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#C8C0A8" stopOpacity="0.8" />
        </linearGradient>
        {/* Sign drop shadow */}
        <filter id="gm-signshadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="3" result="off" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sky / backdrop */}
      <rect x="0" y="0" width="320" height="380" fill="#F3F2ED" />

      {/* Building facade */}
      <rect x="20" y="40" width="280" height="320" fill="url(#gm-brick)" />

      {/* Top cornice line */}
      <rect x="20" y="40" width="280" height="6" fill="#9A8D75" />

      {/* Sign panel — the doen. sign on the facade */}
      <g filter="url(#gm-signshadow)">
        <rect x="46" y="78" width="228" height="46" rx="2" fill="url(#gm-sign)" />
        {/* doen. wordmark */}
        <text
          x="160"
          y="111"
          textAnchor="middle"
          fill="#FFFFFF"
          style={{
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-1.5px',
          }}
        >
          doen
        </text>
        {/* Flame punt */}
        <circle cx="208" cy="114" r="3.5" fill="#F15025" />
      </g>

      {/* Subtle measurement annotation top — sign dimensions */}
      <g opacity="0.55">
        <line x1="46" y1="68" x2="274" y2="68" stroke="#F15025" strokeWidth="0.6" strokeDasharray="2 2" />
        <line x1="46" y1="64" x2="46" y2="72" stroke="#F15025" strokeWidth="0.6" />
        <line x1="274" y1="64" x2="274" y2="72" stroke="#F15025" strokeWidth="0.6" />
        <text
          x="160"
          y="64"
          textAnchor="middle"
          fill="#F15025"
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          2280 MM
        </text>
      </g>

      {/* Windows — 2 rows of 3 */}
      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => (
          <g key={`${row}-${col}`}>
            <rect
              x={56 + col * 78}
              y={158 + row * 78}
              width="60"
              height="58"
              fill="url(#gm-glass)"
              stroke="#7A6F58"
              strokeWidth="1.5"
            />
            {/* Window cross */}
            <line
              x1={86 + col * 78}
              y1={158 + row * 78}
              x2={86 + col * 78}
              y2={216 + row * 78}
              stroke="#7A6F58"
              strokeWidth="1"
            />
            <line
              x1={56 + col * 78}
              y1={187 + row * 78}
              x2={116 + col * 78}
              y2={187 + row * 78}
              stroke="#7A6F58"
              strokeWidth="1"
            />
          </g>
        ))
      )}

      {/* Door at center bottom */}
      <rect x="140" y="316" width="40" height="44" fill="#8B6F47" stroke="#5A4530" strokeWidth="1.5" />
      <circle cx="172" cy="340" r="1.5" fill="#1A1A1A" />

      {/* Sidewalk / ground */}
      <rect x="0" y="360" width="320" height="20" fill="#A89A85" />
      <line x1="0" y1="360" x2="320" y2="360" stroke="#7A6F58" strokeWidth="1" />

      {/* Tiny figure for scale (silhouette) */}
      <g transform="translate(254, 332)" opacity="0.7">
        <circle cx="0" cy="0" r="3" fill="#3F3F3A" />
        <rect x="-3" y="3" width="6" height="20" rx="1" fill="#3F3F3A" />
        <rect x="-3" y="22" width="2.5" height="6" fill="#3F3F3A" />
        <rect x="0.5" y="22" width="2.5" height="6" fill="#3F3F3A" />
      </g>

      {/* Caption strip below */}
      <g transform="translate(0, 380)">
        <rect x="0" y="-8" width="320" height="16" fill="#0F3A42" />
        <text
          x="160"
          y="3"
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 7,
            fontWeight: 600,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Gevelreclame · Hoofdstraat 24 · Mockup
        </text>
      </g>
    </svg>
  )
}
