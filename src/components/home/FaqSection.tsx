'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners } from '@/components/brand/BrandMarks'
import { categories, faqs, type CategoryId } from '@/data/faqs'

function renderAnswer(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#1A535C', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function FaqSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [activeCategory, setActiveCategory] = useState<CategoryId>('prijs')
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const filtered = faqs.filter((f) => f.category === activeCategory)

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
      {/* Soft blurred ambient blobs */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -left-20 w-[440px] h-[440px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
      />
      {/* Flame accent */}
      <div
        aria-hidden
        className="absolute top-[35%] right-[20%] w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#F15025', opacity: 0.05, filter: 'blur(100px)' }}
      />

      {/* Subtle dots */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
          backgroundSize: '22px 22px',
        }}
      />

      <div className="container-site relative py-24 md:py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-7">
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: '#F15025', opacity: 0.45 }}
              />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
            </span>
            <span
              className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
              style={{ color: '#6B6B66' }}
            >
              Veelgestelde vragen
            </span>
          </div>

          <h2
            className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2.5px] leading-[0.95]"
            style={{ fontSize: 'clamp(36px, 5vw, 68px)', color: '#1A535C' }}
          >
            <span className="block">Vragen<span style={{ color: '#F15025' }}>?</span></span>
            <span className="block" style={{ color: '#6B6B66' }}>
              <SerifItalic style={{ letterSpacing: '-2px' }}>Stel</SerifItalic> ze
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>

          <p className="text-[16px] md:text-[18px] leading-[1.55] max-w-lg mt-6" style={{ color: '#3F3F3A' }}>
            Of lees alvast wat anderen vroegen.
          </p>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap gap-2 mb-10 md:mb-12"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            const count = faqs.filter((f) => f.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setOpenFaq(null)
                }}
                className="inline-flex items-center gap-2 px-4 h-[40px] rounded-full font-mono text-[11px] font-bold tracking-[0.15em] uppercase transition-all duration-200"
                style={{
                  backgroundColor: isActive ? '#1A535C' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#1A535C',
                  border: isActive
                    ? '1px solid #1A535C'
                    : '1px solid rgba(26,83,92,0.18)',
                }}
              >
                {cat.label}
                <span
                  className="text-[10px] tabular-nums"
                  style={{
                    color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(26,83,92,0.45)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </motion.div>

        {/* FAQ list */}
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              {filtered.map((faq, i) => {
                const faqKey = `${activeCategory}-${i}`
                const isOpen = openFaq === faqKey
                return (
                  <motion.div
                    key={faqKey}
                    className="rounded-[10px] overflow-hidden bg-white transition-all duration-300"
                    style={{
                      border: '1px solid rgba(26,83,92,0.08)',
                      boxShadow: isOpen
                        ? '0 12px 28px -10px rgba(20,40,40,0.16)'
                        : '0 1px 2px rgba(20,40,40,0.04)',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faqKey)}
                      aria-expanded={isOpen}
                      aria-controls={`${faqKey}-content`}
                      className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A535C] rounded-[10px]"
                    >
                      <span
                        className="text-[15px] md:text-[16px] font-semibold pr-4 transition-colors group-hover:text-[#F15025]"
                        style={{ color: '#1A535C' }}
                      >
                        {faq.q}
                      </span>
                      <motion.span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        animate={{
                          backgroundColor: isOpen ? '#F15025' : '#F3F2ED',
                          rotate: isOpen ? 45 : 0,
                        }}
                        transition={{ duration: 0.25 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M6 2V10M2 6H10"
                            stroke={isOpen ? 'white' : '#1A535C'}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          id={`${faqKey}-content`}
                          role="region"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p
                            className="text-[14px] md:text-[15px] leading-[1.65] px-5 md:px-6 pb-5"
                            style={{ color: '#3F3F3A' }}
                          >
                            {renderAnswer(faq.a)}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          {/* Bottom CTA */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-center text-[14px] md:text-[15px] mt-12"
            style={{ color: '#6B6B66' }}
          >
            Staat jouw vraag er niet bij?{' '}
            <a
              href="/contact"
              className="font-semibold transition-opacity hover:opacity-70 group inline-flex items-center gap-1"
              style={{ color: '#1A535C' }}
            >
              <span className="relative">
                Stel hem direct
                <span
                  className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                  style={{ backgroundColor: '#1A535C' }}
                />
              </span>
              <span style={{ color: '#F15025' }}>.</span>
            </a>
          </motion.p>
        </div>
      </div>
    </section>
  )
}
