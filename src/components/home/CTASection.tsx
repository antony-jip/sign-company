'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners, FlameStamp } from '@/components/brand/BrandMarks'

export default function CTASection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      className="relative"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      {/* Backdrop layer scoped */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-[520px] h-[520px] rounded-full"
          style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[460px] h-[460px] rounded-full"
          style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
        />
        <div
          className="absolute top-[30%] left-[55%] w-[360px] h-[360px] rounded-full"
          style={{ backgroundColor: '#F15025', opacity: 0.08, filter: 'blur(100px)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
      <FlameStamp size={420} opacity={0.05} style={{ bottom: -160, right: -160 }} />

      <div className="container-site relative py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-7"
          >
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: '#F15025', opacity: 0.45 }}
              />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
            </span>
            <span
              className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase"
              style={{ color: '#6B6B66' }}
            >
              30 dagen gratis · geen creditcard
            </span>
          </motion.div>

          {/* Massive closing statement */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading font-bold tracking-[-2px] md:tracking-[-3px] leading-[0.92] mb-10"
            style={{ fontSize: 'clamp(44px, 7vw, 108px)', color: '#1A535C' }}
          >
            <span className="block">Stop met rommelen<span style={{ color: '#F15025' }}>.</span></span>
            <span className="block" style={{ color: '#6B6B66' }}>
              Begin met <SerifItalic style={{ letterSpacing: '-2px' }}>doen</SerifItalic>
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </motion.h2>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-5"
          >
            <a
              href="https://app.doen.team/register"
              className="inline-flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.18em] uppercase text-white px-7 h-[56px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#1A535C]"
              style={{ backgroundColor: '#F15025', boxShadow: '0 10px 28px rgba(241,80,37,0.32)' }}
            >
              <span>Start gratis</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 text-[14px] font-semibold transition-opacity hover:opacity-70 group"
              style={{ color: '#1A535C' }}
            >
              <span className="relative">
                Of mail me
                <span
                  className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                  style={{ backgroundColor: '#1A535C' }}
                />
              </span>
              <span aria-hidden>→</span>
            </a>
          </motion.div>

          {/* Sign-off */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 text-[20px] md:text-[24px]"
            style={{
              color: '#6B6B66',
              fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            tot snel<span style={{ color: '#F15025' }}>.</span>
          </motion.p>
        </div>
      </div>
    </section>
  )
}
