/**
 * doen.-icoonset — custom SVG icons voor de 10 modules.
 *
 * Brand DNA:
 *   - 24×24 viewBox
 *   - 1.6 stroke-width, round caps + joins
 *   - currentColor voor stroke (themable)
 *   - Elke icoon heeft één subtiele "flame-dot" accent in #F15025
 *     als doen.-handtekening (de "punt" achter elke modulenaam)
 */

import { type SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const FLAME = '#F15025'
const stroke = 'currentColor'

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

/* ──────────── 01. Projecten — gestapelde mappen ──────────── */
export function IconProjecten(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 8a1.5 1.5 0 0 1 1.5-1.5h4l2 2h9A1.5 1.5 0 0 1 21 10v8.5A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5V8Z" />
      <path d="M3 11.5h18" opacity="0.5" />
      <circle cx="19" cy="6" r="1.6" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 02. Offertes — document met regels ──────────── */
export function IconOffertes(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8.5L19 8v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-14A1.5 1.5 0 0 1 6.5 4Z" />
      <path d="M14 3.5V8h5" opacity="0.5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
      <circle cx="19" cy="3.5" r="1.6" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 03. Klantportaal — venster met cursor ──────────── */
export function IconPortaal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="13" rx="1.5" />
      <path d="M3 8.5h18" opacity="0.5" />
      <circle cx="6" cy="6.5" r="0.7" fill={stroke} stroke="none" />
      <circle cx="8.5" cy="6.5" r="0.7" fill={stroke} stroke="none" />
      <path d="M11 13.5 13.5 16l1-2 2.5 1L13.5 11Z" />
      <circle cx="20.5" cy="6.5" r="1.4" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 04. Planning — kalender met dag-marker ──────────── */
export function IconPlanning(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 10h17" opacity="0.6" />
      <path d="M8 3v4M16 3v4" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 05. Werkbonnen — clipboard met handtekening ──────────── */
export function IconWerkbonnen(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="5" width="14" height="16" rx="1.5" />
      <rect x="8.5" y="3" width="7" height="3.5" rx="1" />
      <path d="M9 11.5h6M9 14.5h6" opacity="0.5" />
      <path d="M9 17.5c1.5-1.5 3 1.5 4.5 0s2 1 2 1" stroke={FLAME} strokeWidth="1.4" />
    </svg>
  )
}

/* ──────────── 06. Facturen — bonnetje ──────────── */
export function IconFacturen(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3v18l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V3l-2 1.5L14 3l-2 1.5L10 3 8 4.5 6 3Z" />
      <path d="M9 9h6M9 12h6M9 15h3" opacity="0.55" />
      <circle cx="19" cy="3" r="1.6" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 07. Email — envelop ──────────── */
export function IconEmail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="m3 7 9 6.5L21 7" />
      <circle cx="20" cy="6" r="2" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 08. Taken — checklist ──────────── */
export function IconTaken(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="6" height="6" rx="1" />
      <path d="m4.5 7.5 1.5 1.5 2-2.5" stroke={FLAME} strokeWidth="1.6" />
      <rect x="3" y="13.5" width="6" height="6" rx="1" />
      <path d="M12 7.5h8M12 16.5h8" />
      <path d="M12 9.5h5" opacity="0.5" />
      <path d="M12 18.5h5" opacity="0.5" />
    </svg>
  )
}

/* ──────────── 09. Visualizer — afbeelding met sparkles ──────────── */
export function IconVisualizer(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="14" height="14" rx="1.5" />
      <circle cx="8" cy="9.5" r="1.5" />
      <path d="m3.5 16 4-4 3 3 3.5-4.5 3 4" />
      <path d="m20 4 .8 1.8L22.5 6.5l-1.7.8L20 9l-.8-1.8-1.7-.8 1.7-.7Z" fill={FLAME} stroke="none" />
    </svg>
  )
}

/* ──────────── 10. AI-assistent — knipoog spark ──────────── */
export function IconAIAssistent(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 2.5 1.6 4.4 4.4 1.6-4.4 1.6L12 14.5l-1.6-4.4L6 8.5l4.4-1.6Z" />
      <circle cx="6" cy="17.5" r="1.4" fill={FLAME} stroke="none" />
      <path d="m18.5 16 .8 1.8L21 18.5l-1.7.7-.8 1.8-.8-1.8L16 18.5l1.7-.7Z" opacity="0.7" />
    </svg>
  )
}

/* ──────────── Convenience map voor ModulesCarousel ──────────── */
export const DOEN_ICONS = {
  Projecten: IconProjecten,
  Offertes: IconOffertes,
  Klantportaal: IconPortaal,
  Planning: IconPlanning,
  Werkbonnen: IconWerkbonnen,
  Facturen: IconFacturen,
  Email: IconEmail,
  Taken: IconTaken,
  Visualizer: IconVisualizer,
  AIAssistent: IconAIAssistent,
} as const
