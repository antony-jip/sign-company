/**
 * PageBackdrop — shared backdrop layer for all sections in the new
 * Hero/cream aesthetic. Drop into any section:
 *
 *   <section className="relative" style={{ backgroundColor: '#F3F2ED' }}>
 *     <PageBackdrop variant="default" />
 *     <TrimCorners ... />
 *     <div className="container-site relative ...">
 *       ... content ...
 *     </div>
 *   </section>
 *
 * Variants:
 *   - default: 2 tan blobs (top-right + bottom-left)
 *   - mirror: 2 tan blobs (top-left + bottom-right)
 *   - flame: adds a subtle flame accent blob
 *   - dark: white-on-dark dot pattern for petrol/teal backgrounds
 */

interface Props {
  variant?: 'default' | 'mirror' | 'flame' | 'dark'
  showDots?: boolean
}

export default function PageBackdrop({ variant = 'default', showDots = true }: Props) {
  const isDark = variant === 'dark'
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft tan blob 1 */}
      {!isDark && variant === 'default' && (
        <div
          className="absolute -top-20 -right-20 w-[520px] h-[520px] rounded-full"
          style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
        />
      )}
      {!isDark && variant === 'mirror' && (
        <div
          className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full"
          style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
        />
      )}
      {!isDark && variant === 'flame' && (
        <div
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
          style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
        />
      )}

      {/* Soft tan blob 2 */}
      {!isDark && variant === 'default' && (
        <div
          className="absolute -bottom-20 -left-20 w-[460px] h-[460px] rounded-full"
          style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
        />
      )}
      {!isDark && variant === 'mirror' && (
        <div
          className="absolute -bottom-20 -right-20 w-[460px] h-[460px] rounded-full"
          style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
        />
      )}
      {!isDark && variant === 'flame' && (
        <div
          className="absolute -bottom-20 -left-20 w-[480px] h-[480px] rounded-full"
          style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
        />
      )}

      {/* Flame accent */}
      {variant === 'flame' && (
        <div
          className="absolute top-[40%] left-[55%] w-[300px] h-[300px] rounded-full"
          style={{ backgroundColor: '#F15025', opacity: 0.06, filter: 'blur(100px)' }}
        />
      )}

      {/* Dark variant blobs */}
      {isDark && (
        <>
          <div
            className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full"
            style={{ backgroundColor: '#1A535C', opacity: 0.4, filter: 'blur(80px)' }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-[460px] h-[460px] rounded-full"
            style={{ backgroundColor: '#1A535C', opacity: 0.35, filter: 'blur(90px)' }}
          />
        </>
      )}

      {/* Subtle dots */}
      {showDots && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: isDark
              ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='white' opacity='0.06'/></svg>")`
              : `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
            backgroundSize: '22px 22px',
          }}
        />
      )}
    </div>
  )
}
