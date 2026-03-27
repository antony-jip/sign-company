'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import SectionReveal from '../SectionReveal'

export default function VisualizerSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [sliderPos, setSliderPos] = useState(35)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleMove(clientX: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Full-width dark section */}
      <div style={{ backgroundColor: '#0F3A42' }}>
        <div className="container-site py-24 md:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-5 block" style={{ color: '#F15025' }}>
                Sign Visualizer
              </span>

              <h2 className="font-heading text-[40px] md:text-[56px] font-bold text-white tracking-[-2.5px] leading-[0.95] mb-6">
                Laat zien<span className="text-flame">.</span><br />
                <span className="text-white/30">Niet alleen</span><br />
                vertellen<span className="text-flame">.</span>
              </h2>

              <p className="text-[17px] md:text-[19px] leading-relaxed mb-5 text-white/50 max-w-lg">
                Upload een foto van de locatie. AI visualiseert het eindresultaat. Je klant ziet <strong className="text-white/70">direct</strong> hoe het eruit komt te zien. Geen Photoshop, geen uurtje extra.
              </p>

              {/* How it works — 3 steps */}
              <div className="space-y-4 mb-8">
                {[
                  { nr: '1', text: 'Upload een foto van de gevel, auto of het interieur' },
                  { nr: '2', text: 'AI genereert een realistische visualisatie' },
                  { nr: '3', text: 'Deel via het portaal of voeg toe aan je offerte' },
                ].map(step => (
                  <motion.div
                    key={step.nr}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 + parseInt(step.nr) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <span className="text-[13px] font-bold font-mono text-white/50">{step.nr}</span>
                    </div>
                    <span className="text-[15px] text-white/60">{step.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Signing types */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['Gevelreclame', 'Lichtreclame', 'Autobelettering', 'Raambelettering', 'Interieursigning'].map(item => (
                  <span
                    key={item}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full text-white/50"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* Pricing note */}
              <div className="rounded-xl px-5 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F15025' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[14px] font-semibold text-white block">Betaal per visualisatie</span>
                    <span className="text-[13px] text-white/40">Krediet bijkopen wanneer je wilt. Vanaf een paar cent per beeld. Geen abonnement, geen minimum.</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Before/After slider */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                ref={containerRef}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-col-resize select-none"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
                onMouseMove={e => handleMove(e.clientX)}
                onTouchMove={e => handleMove(e.touches[0].clientX)}
              >
                {/* "Before" — empty building */}
                <div className="absolute inset-0">
                  <svg viewBox="0 0 600 450" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    <rect width="600" height="450" fill="#D8D4CE" />
                    <rect width="600" height="60" y="0" fill="#C8C8C0" opacity="0.3" />
                    <rect x="80" y="60" width="440" height="340" rx="4" fill="#C8C4BE" />
                    <rect x="120" y="100" width="100" height="70" rx="4" fill="#B8B4AE" />
                    <rect x="250" y="100" width="100" height="70" rx="4" fill="#B8B4AE" />
                    <rect x="380" y="100" width="100" height="70" rx="4" fill="#B8B4AE" />
                    <rect x="120" y="200" width="100" height="70" rx="4" fill="#B8B4AE" />
                    <rect x="250" y="200" width="100" height="70" rx="4" fill="#B8B4AE" />
                    <rect x="380" y="200" width="100" height="70" rx="4" fill="#B8B4AE" />
                    <rect x="260" y="310" width="80" height="90" rx="4" fill="#A8A4A0" />
                    <rect x="0" y="400" width="600" height="50" fill="#B0ACA6" />
                  </svg>
                </div>

                {/* "After" — with signing */}
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                  <svg viewBox="0 0 600 450" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    <rect width="600" height="450" fill="#E4E0DA" />
                    <rect width="600" height="60" y="0" fill="#D0D0C8" opacity="0.3" />
                    <rect x="80" y="60" width="440" height="340" rx="4" fill="#D4D0CA" />
                    <rect x="120" y="100" width="100" height="70" rx="4" fill="#C4C0BA" />
                    <rect x="250" y="100" width="100" height="70" rx="4" fill="#C4C0BA" />
                    <rect x="380" y="100" width="100" height="70" rx="4" fill="#C4C0BA" />
                    <rect x="120" y="200" width="100" height="70" rx="4" fill="#C4C0BA" />
                    <rect x="250" y="200" width="100" height="70" rx="4" fill="#C4C0BA" />
                    <rect x="380" y="200" width="100" height="70" rx="4" fill="#C4C0BA" />
                    <rect x="260" y="310" width="80" height="90" rx="4" fill="#B4B0AA" />
                    <rect x="0" y="400" width="600" height="50" fill="#C0BCB6" />

                    {/* SIGNING */}
                    <rect x="100" y="63" width="360" height="28" rx="4" fill="#1A535C" />
                    <text x="280" y="82" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">BAKKER RECLAME</text>
                    <rect x="510" y="80" width="18" height="100" rx="3" fill="#F15025" />
                    <text x="519" y="145" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui" transform="rotate(-90 519 145)">OPEN</text>
                    <rect x="130" y="215" width="80" height="6" rx="2" fill="#1A535C" opacity="0.5" />
                    <rect x="260" y="215" width="80" height="6" rx="2" fill="#1A535C" opacity="0.5" />
                    <rect x="390" y="215" width="80" height="6" rx="2" fill="#1A535C" opacity="0.5" />
                    {/* Glow */}
                    <rect x="100" y="60" width="360" height="34" rx="5" fill="#1A535C" opacity="0.08" />
                  </svg>
                </div>

                {/* Slider handle */}
                <div
                  className="absolute top-0 bottom-0 z-20 flex items-center"
                  style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-[2px] h-full bg-white/80" style={{ boxShadow: '0 0 10px rgba(0,0,0,0.3)' }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
                    style={{ backgroundColor: '#F15025', boxShadow: '0 4px 20px rgba(241,80,37,0.5)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M6 4L2 10L6 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 4L18 10L14 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg z-10 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <span className="text-[11px] font-bold text-white tracking-wider">VOOR</span>
                </div>
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg z-10" style={{ backgroundColor: '#1A535C' }}>
                  <span className="text-[11px] font-bold text-white tracking-wider">NA</span>
                </div>
              </div>

              {/* Caption */}
              <div className="flex items-center justify-center gap-2 mt-5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 3L1 8L4 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                  <path d="M12 3L15 8L12 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                </svg>
                <span className="text-[12px] text-white/30">Sleep om het verschil te zien</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Spectrum bar transition out */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #0F3A42, #1A535C, #F15025)' }} />
    </section>
  )
}
