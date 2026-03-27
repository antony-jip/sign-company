'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import SectionReveal from '../SectionReveal'

const sections = [
  {
    headline: 'Tekeningen delen zonder gedoe',
    oneliner: 'Je klant ziet alles in het portaal. Geen mails meer kwijt.',
    accent: '#6A5A8A',
    image: '/images/portaal.jpg',
  },
  {
    headline: 'Niks schiet er doorheen',
    oneliner: 'Automatische opvolging. Ook als het druk is.',
    accent: '#F15025',
    image: '/images/opvolging.png',
  },
  {
    headline: 'Gebouwd door signmakers',
    oneliner: 'We kennen het vak. Dus bouwden we wat we misten.',
    accent: '#1A535C',
    image: '/images/signmakers.png',
  },
  {
    headline: 'Klaar voor AI',
    oneliner: 'Alles hangt samen. Daardoor kan AI je echt helpen.',
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
      className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center ${index > 0 ? 'mt-16 md:mt-28' : ''}`}
    >
      {/* Text */}
      <motion.div
        className={reversed ? 'md:order-2' : 'md:order-1'}
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="font-mono text-[12px] font-bold tracking-wider" style={{ color: section.accent, opacity: 0.5 }}>
          0{index + 1}
        </span>
        <h3 className="font-heading text-[32px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[1.05] mt-2 mb-4">
          {section.headline}<span className="text-flame">.</span>
        </h3>
        <p className="text-[18px] md:text-[20px] leading-relaxed" style={{ color: '#6B6B66' }}>
          {section.oneliner}
        </p>
        <motion.div
          className="h-[3px] rounded-full mt-6 w-16 origin-left"
          style={{ backgroundColor: section.accent }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>

      {/* Illustration */}
      <motion.div
        className={`${reversed ? 'md:order-1' : 'md:order-2'}`}
        initial={{ opacity: 0, x: reversed ? -30 : 30, scale: 0.95 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src={section.image}
          alt={section.headline}
          width={1200}
          height={800}
          className="w-full h-auto rounded-2xl"
        />
      </motion.div>
    </motion.div>
  )
}

export default function ValueProps() {
  return (
    <section className="py-24 md:py-36">
      <div className="container-site">
        <SectionReveal>
          <div className="mb-16 md:mb-24">
            <h2 className="font-heading text-[36px] md:text-[48px] font-bold text-petrol tracking-[-2px] leading-[1.05] mb-5">
              Waarom doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[17px] md:text-[19px] max-w-lg leading-relaxed" style={{ color: '#6B6B66' }}>
              Te druk, te veel losse tools, geen overzicht. Dus bouwden we wat we misten.
            </p>
          </div>
        </SectionReveal>

        {sections.map((section, i) => (
          <PropBlock key={section.headline} section={section} index={i} />
        ))}
      </div>
    </section>
  )
}
