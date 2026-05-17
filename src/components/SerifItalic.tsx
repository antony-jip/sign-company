import { ReactNode, CSSProperties } from 'react'

/**
 * Serif italic emphasis word — mirrors the exact pattern from the DOEN app
 * (Instrument Serif, italic, weight 400). Used inside sans-serif headlines
 * to emphasize one word, e.g.: "Klaar om te <SerifItalic>beginnen</SerifItalic>".
 */
export default function SerifItalic({
  children,
  style,
  className = '',
}: {
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 400,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
