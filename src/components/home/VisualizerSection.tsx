'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import SectionReveal from '../SectionReveal'
import EditorialMasthead from '@/components/EditorialMasthead'
import SerifItalic from '@/components/SerifItalic'
import EditorialPhotoPlaceholder from '@/components/EditorialPhotoPlaceholder'
import { Building2, Sparkles } from 'lucide-react'

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
        <div className="container-site py-20 md:py-28">
          <EditorialMasthead kicker="Vol. 01 · Kolom 04" label="Sign Visualizer" tone="dark" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-heading text-[40px] md:text-[56px] font-bold text-white tracking-[-2.5px] leading-[0.95] mb-6">
                Laat <SerifItalic>zien</SerifItalic><span className="text-flame">.</span><br />
                <span className="text-white/30">Niet alleen</span><br />
                vertellen<span className="text-flame">.</span>
              </h2>

              <p className="text-[17px] md:text-[19px] leading-relaxed mb-5 text-white/50 max-w-lg">
                Upload een foto van de locatie. AI visualiseert het eindresultaat. Je klant ziet <strong className="text-white/70">direct</strong> hoe het eruit komt te zien. Koppel de visualisatie aan een <strong className="text-white/70">project of offerte</strong> en deel het via het portaal.
              </p>

              {/* How it works — 3 steps */}
              <div className="space-y-4 mb-8">
                {[
                  { nr: '1', text: 'Upload een foto van de gevel, auto of het interieur' },
                  { nr: '2', text: 'AI genereert een realistische visualisatie' },
                  { nr: '3', text: 'Koppel aan je project of offerte, deel via het portaal' },
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
                    <span className="text-[13px] text-white/40">Draait op Nano Banana 2. Krediet bijkopen wanneer je wilt. Vanaf een paar cent per beeld.</span>
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
              {/* Editorial before/after — two stacked placeholders, slider hidden until photos are in */}
              <div
                ref={containerRef}
                className="relative aspect-[4/3] overflow-hidden select-none"
                onMouseMove={e => handleMove(e.clientX)}
                onTouchMove={e => handleMove(e.touches[0].clientX)}
              >
                {/* "Before" — empty facade placeholder */}
                <div className="absolute inset-0">
                  <EditorialPhotoPlaceholder
                    aspect="aspect-[4/3]"
                    tone="dark"
                    icon={<Building2 className="w-14 h-14" strokeWidth={1.2} />}
                    stampLabel="Voor"
                    stampColor="#143F46"
                    caption="Gevel · vervang me"
                    description="Foto van een lege gevel of object. Recht voor, daglicht, zonder reclame."
                    ratio="4 : 3"
                    footerLeft="Voor de visualisatie"
                    footerRight="Nr. 041"
                  />
                </div>

                {/* "After" — same with signing */}
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                  <EditorialPhotoPlaceholder
                    aspect="aspect-[4/3]"
                    tone="dark"
                    icon={<Sparkles className="w-14 h-14" strokeWidth={1.4} />}
                    stampLabel="Na"
                    stampColor="#F15025"
                    caption="Met signing · vervang me"
                    description="Zelfde gevel, nu met door doen. gegenereerde signing. Zelfde licht, zelfde hoek."
                    ratio="4 : 3"
                    footerLeft="Na de visualisatie"
                    footerRight="Nr. 042"
                  />
                </div>

                {/* Slider handle */}
                <div
                  className="absolute top-0 bottom-0 z-20 flex items-center cursor-col-resize"
                  style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-[2px] h-full bg-white/80" style={{ boxShadow: '0 0 10px rgba(0,0,0,0.3)' }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center"
                    style={{ backgroundColor: '#F15025', boxShadow: '0 4px 20px rgba(241,80,37,0.5)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M6 4L2 10L6 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 4L18 10L14 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="flex items-center justify-center gap-2 mt-5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 3L1 8L4 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                  <path d="M12 3L15 8L12 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                </svg>
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-white/35">Sleep om het verschil te zien</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Spectrum bar */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #1A535C, #F15025)' }} />
    </section>
  )
}
