'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'

const props = [
  {
    headline: 'Je klant doet mee.',
    sub: 'Zonder gedoe.',
    text: 'Eén link. Geen inlog. Je klant ziet tekeningen, keurt offertes goed, reageert op bestanden. Geen WhatsApp-chaos meer.',
    accent: '#6A5A8A',
    image: '/images/portaal.jpg',
  },
  {
    headline: 'Niks vergeten.',
    sub: 'doen. volgt op.',
    text: 'Offerte verstuurd en geen reactie? Automatische herinnering. Factuur verlopen? Je weet het direct. Niets schiet er doorheen.',
    accent: '#F15025',
    image: '/images/opvolging.png',
  },
  {
    headline: 'Door het vak.',
    sub: 'Voor het vak.',
    text: 'Niet door consultants die het vak googlen. Door signmakers die zelf in de werkplaats staan. Elk scherm is gebouwd voor hoe jij werkt.',
    accent: '#1A535C',
    image: '/images/signmakers.png',
  },
  {
    headline: 'AI die meedenkt.',
    sub: 'Niet meepraat.',
    text: 'Daan kent je data. Schrijft offerteteksten, vat mails samen, rekent vierkante meters uit. Vraag wat je wilt. Daan doet het.',
    accent: '#1A535C',
    image: '/images/ai-verbonden.png',
  },
]

function PropBlock({ prop, index }: { prop: typeof props[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reversed = index % 2 !== 0

  return (
    <motion.div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center ${index > 0 ? 'mt-20 md:mt-32' : ''}`}
    >
      <motion.div
        className={reversed ? 'md:order-2' : 'md:order-1'}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h3 className="font-heading text-[36px] md:text-[44px] font-bold tracking-[-2px] leading-[0.95] mb-1" style={{ color: '#1A1A1A' }}>
          {prop.headline.split('.')[0]}<span style={{ color: '#F15025' }}>.</span>
        </h3>
        <p className="font-heading text-[18px] md:text-[22px] tracking-[-0.5px] mb-5" style={{ color: prop.accent, opacity: 0.5 }}>
          {prop.sub.replace('.', '')}<span style={{ color: '#F15025' }}>.</span>
        </p>
        <p className="text-[16px] md:text-[17px] leading-[1.7] max-w-md" style={{ color: '#6B6B66' }}>
          {prop.text}
        </p>
        <motion.div
          className="h-[3px] rounded-full mt-7 origin-left"
          style={{ background: `linear-gradient(90deg, ${prop.accent}, transparent)`, maxWidth: 60 }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
      </motion.div>

      <motion.div
        className={reversed ? 'md:order-1' : 'md:order-2'}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src={prop.image}
          alt={prop.headline}
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
        {props.map((prop, i) => (
          <PropBlock key={prop.headline} prop={prop} index={i} />
        ))}
      </div>
    </section>
  )
}
