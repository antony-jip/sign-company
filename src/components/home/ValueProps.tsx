'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import SectionReveal from '../SectionReveal'

const props = [
  {
    nummer: '01',
    headline: 'Tekeningen delen zonder gedoe',
    description: 'Geen mails die kwijtraken. Geen WhatsApp-groepen vol bestanden. Je klant ziet alles in het portaal. Tekeningen, offertes, updates. Professioneel en overzichtelijk.',
    accent: '#6A5A8A',
  },
  {
    nummer: '02',
    headline: 'Niks schiet er doorheen',
    description: 'Offerte verstuurd maar geen reactie? De klant krijgt automatisch een herinnering. Factuur verlopen? Je weet het direct. Alle opvolging geregeld, ook als het druk is.',
    accent: '#F15025',
  },
  {
    nummer: '03',
    headline: 'Gebouwd door signmakers',
    description: 'We kennen het vak omdat we het zelf doen. Uiteenlopende projecten, klein tot groot, en geen software die het begreep. Dus bouwden we het zelf.',
    accent: '#1A535C',
  },
  {
    nummer: '04',
    headline: 'Klaar voor AI',
    description: 'Alles hangt samen als een orkest. Klantdata, projecten, offertes, facturen. Daardoor kan AI je echt helpen. Niet over vijf jaar. Nu.',
    accent: '#1A535C',
  },
]

function PropRow({ prop, index }: { prop: typeof props[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const isEven = index % 2 === 0

  return (
    <motion.div
      ref={ref}
      className="group grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-0 py-12 md:py-16"
      style={{ borderBottom: index < props.length - 1 ? '1px solid rgba(26,83,92,0.06)' : 'none' }}
    >
      {/* Nummer */}
      <motion.div
        className={`md:col-span-2 ${isEven ? 'md:order-1' : 'md:order-1'}`}
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span
          className="font-mono text-[64px] md:text-[80px] font-bold leading-none tracking-tighter select-none"
          style={{ color: prop.accent, opacity: 0.08 }}
        >
          {prop.nummer}
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        className={`md:col-span-4 ${isEven ? 'md:order-2' : 'md:order-3'}`}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <h3 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] leading-[1.1]">
          {prop.headline}<span className="text-flame">.</span>
        </h3>
        {/* Accent line */}
        <motion.div
          className="h-[3px] rounded-full mt-4 origin-left"
          style={{ backgroundColor: prop.accent }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>

      {/* Description */}
      <motion.div
        className={`md:col-span-5 ${isEven ? 'md:order-3' : 'md:order-2'} md:col-start-8`}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-[16px] md:text-[17px] leading-[1.75] max-w-md" style={{ color: '#6B6B66' }}>
          {prop.description}
        </p>
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
            <p className="text-[17px] md:text-[19px] max-w-xl leading-relaxed" style={{ color: '#6B6B66' }}>
              We liepen zelf tegen dezelfde problemen aan. Te druk, te veel losse tools, geen overzicht. Dus bouwden we wat we misten.
            </p>
          </div>
        </SectionReveal>

        <div>
          {props.map((prop, i) => (
            <PropRow key={prop.nummer} prop={prop} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
