'use client'

/**
 * SignTypesStrip — horizontal infinite marquee of sign types.
 * Het IS een knipoog naar de doelgroep, maar de pinned left-label maakt
 * expliciet dat doen. NIET deze signs verkoopt — wij zijn het gereedschap
 * VOOR de mensen die deze signs maken.
 */

const SIGN_TYPES = [
  'Gevelreclame',
  'Lichtreclame',
  'Autobelettering',
  'Raambelettering',
  'Interieursigning',
  'Bouwhekzeil',
  'Vlaggen',
  'Directiesigning',
  'Belettering',
  'Banieren',
  'LED-signing',
  'Vrijstaande zuilen',
]

export default function SignTypesStrip() {
  const items = [...SIGN_TYPES, ...SIGN_TYPES]

  return (
    <section
      aria-label="Doelgroep van doen. — signmakers die dit maken"
      className="relative overflow-hidden py-6 md:py-8"
      style={{
        backgroundColor: '#F3F2ED',
      }}
    >
      <div className="container-site relative flex items-center gap-6 md:gap-10">
        {/* Pinned left label — context: doen. is FOR these makers, not selling these */}
        <div className="shrink-0 max-w-[120px] md:max-w-[160px] z-20 relative">
          <p
            className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase leading-tight"
            style={{ color: '#F15025' }}
          >
            Jij maakt
          </p>
          <p
            className="font-mono text-[9px] md:text-[10px] font-medium tracking-[0.18em] uppercase leading-tight mt-1"
            style={{ color: '#6B6B66' }}
          >
            wij het gereedschap
          </p>
        </div>

        {/* Vertical divider */}
        <div
          aria-hidden
          className="shrink-0 w-px h-12 md:h-16"
          style={{ backgroundColor: 'rgba(26,83,92,0.15)' }}
        />

        {/* Scrolling marquee */}
        <div className="relative flex-1 overflow-hidden">
          {/* Edge fade right */}
          <div
            aria-hidden
            className="absolute right-0 top-0 bottom-0 w-16 md:w-32 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(270deg, #F3F2ED 0%, transparent 100%)',
            }}
          />

          <div className="flex sign-marquee" style={{ width: 'max-content' }}>
            {items.map((label, i) => (
              <span
                key={i}
                className="flex items-center gap-5 md:gap-7 px-4 md:px-6 whitespace-nowrap"
              >
                <span
                  className="font-heading font-bold tracking-tight"
                  style={{
                    fontSize: 'clamp(20px, 3vw, 38px)',
                    color: '#1A535C',
                    letterSpacing: '-1px',
                  }}
                >
                  {label}
                  <span style={{ color: '#F15025' }}>.</span>
                </span>
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#F15025', opacity: 0.45 }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .sign-marquee {
          animation: signScroll 55s linear infinite;
        }
        @keyframes signScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sign-marquee {
            animation: none;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  )
}
