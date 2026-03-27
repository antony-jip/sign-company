'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import SectionReveal from '../SectionReveal'

export default function VisualizerSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [sliderPos, setSliderPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleMove(clientX: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }

  return (
    <section className="py-24 md:py-40 relative overflow-hidden" ref={ref}>
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] w-[400px] h-[400px] rounded-full" style={{ backgroundColor: '#1A535C', opacity: 0.02 }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full" style={{ backgroundColor: '#F15025', opacity: 0.02 }} />
      </div>

      <div className="container-site relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4 block" style={{ color: '#F15025' }}>
              Sign Visualizer
            </span>
            <h2 className="font-heading text-[36px] md:text-[52px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-6">
              Laat zien<span className="text-flame">.</span><br />
              <span className="text-petrol/40">Niet alleen</span> vertellen<span className="text-flame">.</span>
            </h2>
            <p className="text-[17px] md:text-[19px] leading-relaxed mb-6" style={{ color: '#6B6B66' }}>
              Upload een foto van de locatie en AI visualiseert het eindresultaat. Je klant ziet direct hoe de gevelreclame, lichtreclame of autobelettering eruit komt te zien.
            </p>
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#9B9B95' }}>
              Deel de visualisatie via het portaal of voeg hem toe aan je offerte. Geen Photoshop nodig. Geen uurtje extra werk. Gewoon doen.
            </p>

            {/* Mini features */}
            <div className="flex flex-wrap gap-3">
              {['Gevelreclame', 'Lichtreclame', 'Autobelettering', 'Raambelettering', 'Interieursigning'].map(item => (
                <span
                  key={item}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#1A535C0A', color: '#1A535C' }}
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right: Before/After slider */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              ref={containerRef}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-col-resize select-none"
              style={{ backgroundColor: '#E8E6E2' }}
              onMouseMove={e => handleMove(e.clientX)}
              onTouchMove={e => handleMove(e.touches[0].clientX)}
            >
              {/* "Before" — empty building */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full relative">
                  {/* Simple building illustration */}
                  <svg viewBox="0 0 600 450" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    {/* Sky */}
                    <rect width="600" height="450" fill="#E8E6E2" />
                    {/* Building */}
                    <rect x="100" y="80" width="400" height="320" rx="4" fill="#D4D0CA" />
                    {/* Windows */}
                    <rect x="140" y="120" width="80" height="60" rx="3" fill="#C8C4BE" />
                    <rect x="260" y="120" width="80" height="60" rx="3" fill="#C8C4BE" />
                    <rect x="380" y="120" width="80" height="60" rx="3" fill="#C8C4BE" />
                    <rect x="140" y="220" width="80" height="60" rx="3" fill="#C8C4BE" />
                    <rect x="260" y="220" width="80" height="60" rx="3" fill="#C8C4BE" />
                    <rect x="380" y="220" width="80" height="60" rx="3" fill="#C8C4BE" />
                    {/* Door */}
                    <rect x="260" y="320" width="80" height="80" rx="3" fill="#B8B4AE" />
                    {/* Ground */}
                    <rect x="0" y="400" width="600" height="50" fill="#C8C4BE" />
                  </svg>
                </div>
              </div>

              {/* "After" — with signing */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <div className="w-full h-full relative">
                  <svg viewBox="0 0 600 450" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    {/* Sky — warmer */}
                    <rect width="600" height="450" fill="#F0EDE8" />
                    {/* Building */}
                    <rect x="100" y="80" width="400" height="320" rx="4" fill="#DEDAD4" />
                    {/* Windows */}
                    <rect x="140" y="120" width="80" height="60" rx="3" fill="#D0CCC6" />
                    <rect x="260" y="120" width="80" height="60" rx="3" fill="#D0CCC6" />
                    <rect x="380" y="120" width="80" height="60" rx="3" fill="#D0CCC6" />
                    <rect x="140" y="220" width="80" height="60" rx="3" fill="#D0CCC6" />
                    <rect x="260" y="220" width="80" height="60" rx="3" fill="#D0CCC6" />
                    <rect x="380" y="220" width="80" height="60" rx="3" fill="#D0CCC6" />
                    {/* Door */}
                    <rect x="260" y="320" width="80" height="80" rx="3" fill="#C0BCB6" />
                    {/* Ground */}
                    <rect x="0" y="400" width="600" height="50" fill="#D0CCC6" />

                    {/* === SIGNING === */}
                    {/* Main sign board */}
                    <rect x="150" y="90" width="300" height="20" rx="3" fill="#1A535C" />
                    {/* Sign text */}
                    <text x="300" y="106" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">BAKKER RECLAME</text>
                    {/* Side sign */}
                    <rect x="490" y="100" width="15" height="80" rx="2" fill="#F15025" />
                    {/* Window signing */}
                    <rect x="145" y="230" width="70" height="8" rx="2" fill="#1A535C" opacity="0.6" />
                    <rect x="265" y="230" width="70" height="8" rx="2" fill="#1A535C" opacity="0.6" />
                    {/* Glow effect on sign */}
                    <rect x="150" y="88" width="300" height="24" rx="4" fill="#1A535C" opacity="0.1" />
                  </svg>
                </div>
              </div>

              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 z-20 flex items-center"
                style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-full bg-white shadow-lg" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: '#F15025' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M5 3L2 8L5 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M11 3L14 8L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg z-10" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <span className="text-[10px] font-bold text-white tracking-wider uppercase">Voor</span>
              </div>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg z-10" style={{ backgroundColor: '#1A535C' }}>
                <span className="text-[10px] font-bold text-white tracking-wider uppercase">Na</span>
              </div>
            </div>

            {/* Caption */}
            <p className="text-[12px] text-center mt-4" style={{ color: '#9B9B95' }}>
              Sleep om het verschil te zien
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
