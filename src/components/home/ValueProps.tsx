'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import SectionReveal from '../SectionReveal'

const sections = [
  {
    headline: 'Delen',
    sub: 'gewoon doen',
    oneliner: 'Tekeningen, offertes, updates. Je klant ziet alles in het portaal. Geen mails kwijt, geen WhatsApp chaos.',
    accent: '#6A5A8A',
    image: '/images/portaal.jpg',
  },
  {
    headline: 'Opvolgen',
    sub: 'laat doen',
    oneliner: 'Geen reactie op je offerte? Doen. stuurt automatisch een herinnering. Factuur verlopen? Je weet het direct.',
    accent: '#F15025',
    image: '/images/opvolging.png',
  },
  {
    headline: 'Begrijpen',
    sub: 'zelf gedaan',
    oneliner: 'Gebouwd door signmakers die geen software konden vinden die bij hun werk paste. Klein project, groot project. Wij snappen het.',
    accent: '#1A535C',
    image: '/images/signmakers.png',
  },
  {
    headline: 'Verbinden',
    sub: 'slim gedaan',
    oneliner: 'Klantdata, projecten, offertes, facturen. Alles hangt samen als een orkest. Daardoor kan AI je echt helpen. Nu al.',
    accent: '#1A535C',
    image: '/images/ai-verbonden.png',
  },
]

function PropBlock({ section, index }: { section: typeof sections[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const reversed = index % 2 !== 0

  return (
    <motion.div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center ${index > 0 ? 'mt-20 md:mt-32' : ''}`}
    >
      {/* Text */}
      <motion.div
        className={reversed ? 'md:order-2' : 'md:order-1'}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Big action word */}
        <h3 className="font-heading text-[44px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-1">
          {section.headline}<span className="text-flame">.</span>
        </h3>
        {/* Tagline with doen. wordplay */}
        <motion.p
          className="font-heading text-[20px] md:text-[24px] tracking-[-0.5px] mb-6"
          style={{ color: section.accent, opacity: 0.5 }}
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 0.5, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {section.sub}<span className="text-flame">.</span>
        </motion.p>

        <p className="text-[16px] md:text-[18px] leading-[1.7] max-w-md" style={{ color: '#6B6B66' }}>
          {section.oneliner}
        </p>

        {/* Spectrum accent bar */}
        <motion.div
          className="h-1 rounded-full mt-8 origin-left"
          style={{ background: `linear-gradient(90deg, ${section.accent}, ${section.accent}20)`, maxWidth: 80 }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>

      {/* Illustration */}
      <motion.div
        className={reversed ? 'md:order-1' : 'md:order-2'}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative group">
          {/* Colored background shape */}
          <div
            className="absolute -inset-3 md:-inset-5 rounded-3xl transition-all duration-700 group-hover:scale-[1.02]"
            style={{ backgroundColor: section.accent, opacity: 0.04 }}
          />
          <Image
            src={section.image}
            alt={section.headline}
            width={1200}
            height={800}
            className="relative w-full h-auto rounded-2xl"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ValueProps() {
  return (
    <section className="py-24 md:py-40">
      <div className="container-site">
        <SectionReveal>
          <div className="mb-20 md:mb-28 max-w-2xl">
            <motion.p
              className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4"
              style={{ color: '#F15025' }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Waarom doen.
            </motion.p>
            <h2 className="font-heading text-[40px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-6">
              Niet praten over<span className="text-flame">.</span><br />
              <span className="text-petrol/40">Gewoon</span> doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[17px] md:text-[19px] leading-relaxed" style={{ color: '#6B6B66' }}>
              Te druk voor administratie. Te veel losse tools. Geen overzicht. Herkenbaar? Wij ook. Dus bouwden we wat we misten.
            </p>
          </div>
        </SectionReveal>

        <div className="relative">
          {/* Vertical spectrum line connecting all blocks */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-px pointer-events-none hidden md:block">
            <motion.div
              className="w-full h-full origin-top"
              style={{ background: 'linear-gradient(180deg, #6A5A8A, #F15025, #1A535C, #1A535C)' }}
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 0.12 }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-100px' }}
            />
          </div>

          {/* Dots on the line at each section */}
          {sections.map((section, i) => (
            <div key={`dot-${i}`} className="hidden md:block absolute left-1/2 -translate-x-1/2 z-10" style={{ top: `${i * 25 + 5}%` }}>
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: section.accent, boxShadow: `0 0 12px ${section.accent}40` }}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
              />
            </div>
          ))}

          {sections.map((section, i) => (
            <PropBlock key={section.headline} section={section} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
