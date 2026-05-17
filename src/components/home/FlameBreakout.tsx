'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import SerifItalic from '@/components/SerifItalic'

/**
 * Full-bleed flame statement band — breaks up cream sections with a bold
 * statement page (like a magazine separator). Massive sans + serif italic
 * with scattered techy coordinates and a marquee scroll.
 */
export default function FlameBreakout() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ backgroundColor: '#F15025' }}
    >
      {/* Halftone overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='1.5' cy='1.5' r='0.7' fill='%231A1A1A'/></svg>")`,
          backgroundSize: '5px 5px',
        }}
      />

      {/* Corner cross-marks (CYBR style) */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <g stroke="#1A1A1A" strokeWidth="0.18" opacity="0.6">
          <line x1="3" y1="6" x2="9" y2="6" />
          <line x1="6" y1="3" x2="6" y2="9" />
          <line x1="97" y1="6" x2="91" y2="6" />
          <line x1="94" y1="3" x2="94" y2="9" />
          <line x1="3" y1="94" x2="9" y2="94" />
          <line x1="6" y1="91" x2="6" y2="97" />
          <line x1="97" y1="94" x2="91" y2="94" />
          <line x1="94" y1="91" x2="94" y2="97" />
        </g>
      </svg>

      {/* Top meta strip */}
      <div className="container-site pt-6 md:pt-8 flex items-center justify-between font-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase" style={{ color: 'rgba(0,0,0,0.55)' }}>
        <span>{'>'} Tussenpagina · Manifest</span>
        <span className="tabular-nums hidden md:inline">X_001 · Y_026 · Z_∞</span>
        <span>{'<'} 01_van_01</span>
      </div>

      <div className="container-site py-16 md:py-28 relative">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="font-heading font-bold tracking-[-4px] md:tracking-[-6px] leading-[0.85] text-center"
          style={{
            fontSize: 'clamp(64px, 13vw, 220px)',
            color: '#1A1A1A',
          }}
        >
          Vakmanschap<span style={{ color: '#1A1A1A' }}>.</span>
          <br />
          <span className="block" style={{ color: 'rgba(26,26,26,0.45)' }}>
            Geen <SerifItalic>platform</SerifItalic>.
          </span>
        </motion.h2>

        {/* Subline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex items-center justify-center gap-4 md:gap-6 mt-10 md:mt-14 font-mono text-[11px] md:text-[12px] font-bold tracking-[0.22em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          <span className="w-12 h-px" style={{ backgroundColor: '#1A1A1A', opacity: 0.6 }} />
          <span>Door doeners · voor doeners</span>
          <span className="w-12 h-px" style={{ backgroundColor: '#1A1A1A', opacity: 0.6 }} />
        </motion.div>
      </div>

      {/* Bottom marquee — techy scrolling annotation */}
      <div
        className="border-t font-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase whitespace-nowrap overflow-hidden py-2"
        style={{ color: 'rgba(0,0,0,0.5)', borderColor: 'rgba(0,0,0,0.15)' }}
      >
        <div className="animate-marquee flex" style={{ width: 'max-content' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="flex items-center gap-6 px-6">
              <span>{'>'} Vakmanschap verdient beter gereedschap</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{'>'} Editie 2026 · Vol_01</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{'>'} Sinds 1983</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{'>'} doen.team</span>
              <span style={{ opacity: 0.4 }}>·</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
