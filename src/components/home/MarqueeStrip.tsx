'use client'

const items = [
  'offerte',
  'productie',
  'montage',
  'werkbon getekend',
  'factuur verstuurd',
  'betaald',
  'gedaan',
]

function Track() {
  return (
    <span className="inline-flex items-center gap-6 px-6 whitespace-nowrap">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-6">
          <span>
            {it}
            <span style={{ color: '#F15025' }}>.</span>
          </span>
          <span className="opacity-30">/</span>
        </span>
      ))}
    </span>
  )
}

export default function MarqueeStrip() {
  return (
    <section
      aria-hidden
      className="relative overflow-hidden"
      style={{ backgroundColor: '#0F3A42' }}
    >
      <div className="py-5 md:py-6 flex whitespace-nowrap [animation:marquee_42s_linear_infinite] font-heading font-bold tracking-tight text-white"
           style={{ fontSize: 'clamp(20px, 2.4vw, 30px)' }}>
        <Track /><Track /><Track />
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.3333%); }
        }
      `}</style>
    </section>
  )
}
