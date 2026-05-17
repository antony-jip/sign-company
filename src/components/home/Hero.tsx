'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import ConstellationBackground from '@/components/ConstellationBackground'
import SerifItalic from '@/components/SerifItalic'
import HeroAppPreview from '@/components/home/HeroAppPreview'
import { TrimCorners, MeasurementTag, FlameStamp } from '@/components/brand/BrandMarks'

/**
 * Hero — paul-factory + zeroheight inspired.
 * Beige bg, soft tan blobs, MASSIVE uppercase display headline,
 * playful staggered bounceUp entrance per word.
 * Replace the placeholder photo block with:
 *   <Image src="/images/hero/vakman.jpg" alt="..." fill className="object-cover" priority />
 */

// paul-factory bounceUp keyframe (Y+scale+skew+rotate)
const bounceUp = {
  hidden: { opacity: 0, y: 24, scale: 0.96, skewY: 3, rotate: 2 },
  visible: { opacity: 1, y: 0, scale: 1, skewY: 0, rotate: 0 },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function Hero() {
  return (
    <section
      id="hero-section"
      className="relative overflow-hidden"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      {/* Soft blurred ambient blobs — edges dissolve, flow across section boundaries */}
      <div
        aria-hidden
        className="absolute -top-32 -right-20 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E8E1D0', opacity: 0.65, filter: 'blur(80px)' }}
      />
      <div
        aria-hidden
        className="absolute top-[55%] -left-32 w-[460px] h-[460px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E4DBC6', opacity: 0.55, filter: 'blur(80px)' }}
      />
      {/* Subtle flame accent — adds warmth */}
      <div
        aria-hidden
        className="absolute top-[20%] right-[15%] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#F15025', opacity: 0.06, filter: 'blur(90px)' }}
      />
      {/* Constellation/network background — like the doen. app */}
      <ConstellationBackground />

      {/* BRAND: trim corners (print registration marks) — signature of the craft */}
      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />

      {/* BRAND: massive flame stamp bleeding off bottom-right — doen. brand glyph */}
      <FlameStamp size={420} opacity={0.05} style={{ bottom: -180, right: -180 }} />

      <div className="container-site relative pt-28 pb-16 md:pt-44 md:pb-28">

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-end">

          {/* LEFT — text column */}
          <div>
            {/* Eyebrow tag — subtler, sits as a quiet brand-mark */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.05, ease: easing }}
              className="inline-flex items-center gap-2 mb-7"
            >
              <span className="relative inline-flex items-center justify-center w-2 h-2">
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: '#F15025', opacity: 0.4 }}
                />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
              </span>
              <span
                className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
                style={{ color: '#6B6B66' }}
              >
                Nu beschikbaar · 30 dagen gratis
              </span>
            </motion.div>

            {/* MASSIVE uppercase headline — bounceUp per line, staggered */}
            <h1
              className="font-heading font-bold tracking-[-2px] md:tracking-[-3px] leading-[0.95] mb-8 md:mb-10"
              style={{
                fontSize: 'clamp(44px, 6vw, 92px)',
                color: '#1A535C',
              }}
            >
              <span className="block">Vakmanschap</span>
              <span className="block" style={{ color: '#6B6B66' }}>
                <SerifItalic style={{ letterSpacing: '-2px' }}>verdient</SerifItalic> beter
              </span>
              <span className="block">
                gereedschap<span style={{ color: '#F15025' }}>.</span>
              </span>
            </h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.5, ease: easing }}
              className="text-[17px] md:text-[20px] leading-[1.55] max-w-lg mb-10 md:mb-12"
              style={{ color: '#3F3F3A' }}
            >
              Software voor signmakers, gebouwd door iemand die zelf in de werkplaats stond.
              Van eerste klantvraag tot betaalde factuur.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.62, ease: easing }}
              className="flex flex-wrap items-center gap-5 md:gap-6"
            >
              <a
                href="https://app.doen.team/register"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-white px-7 h-[56px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  backgroundColor: '#F15025',
                  boxShadow: '0 8px 24px rgba(241,80,37,0.28)',
                }}
              >
                <span>Start gratis</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </a>
              <a
                href="/hoe-het-werkt"
                className="inline-flex items-center gap-2 text-[15px] font-semibold transition-all group"
                style={{ color: '#1A535C' }}
              >
                <span className="relative">
                  Of zie hoe het werkt
                  <span
                    className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                    style={{ backgroundColor: '#1A535C' }}
                  />
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
            </motion.div>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.78, ease: easing }}
              className="text-[12px] mt-6"
              style={{ color: '#6B6B66' }}
            >
              Geen creditcard nodig. Maandelijks opzegbaar.
            </motion.p>
          </div>

          {/* RIGHT — live app preview, stacked branded cards */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: easing }}
            className="relative"
          >
            {/* Measurement tag above the preview — sign-maker craft signal */}
            <div
              className="absolute -top-6 left-0 right-0 flex justify-center pointer-events-none"
              aria-hidden
            >
              <MeasurementTag label="Live preview · 4:5" width={160} />
            </div>
            <HeroAppPreview />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
