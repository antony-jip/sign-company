'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners, TapePiece } from '@/components/brand/BrandMarks'
import GevelMockup from '@/components/brand/GevelMockup'

/**
 * Brief van de maker — personal founder note in the new Hero aesthetic.
 *
 * Replace placeholders:
 *   - [jouw naam] / [X jaar]  → in the body
 *   - portrait image: swap the placeholder div with
 *     <Image src="/images/maker/portret.jpg" alt="..." fill className="object-cover" />
 */
export default function SocialProof() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
      {/* Backdrop scoped so sticky descendant works */}
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
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="container-site relative py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20 items-start max-w-6xl mx-auto">

          {/* LEFT — portrait + gevel mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Mono label boven foto — editorial chapter marker */}
            <div className="hidden lg:flex items-center gap-2 mb-4">
              <span className="w-6 h-px" style={{ backgroundColor: '#F15025' }} />
              <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#6B6B66' }}>
                De maker · Sign Company 1983
              </span>
            </div>
            {/* Founder portrait */}
            <div
              className="relative aspect-[3/4] w-full overflow-hidden rounded-[6px]"
              style={{
                boxShadow: '0 28px 60px -24px rgba(40,30,20,0.28), 0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <Image
                src="/images/maker/founder.webp"
                alt="De maker van doen."
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
              />
            </div>

            {/* GevelMockup — physical sign on a wall, anchors brand in reality */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-12 -right-4 md:-right-8 w-[200px] md:w-[240px] rounded-[6px] overflow-hidden"
              style={{
                boxShadow: '0 24px 48px -16px rgba(20,40,40,0.25), 0 2px 6px rgba(0,0,0,0.06)',
                border: '1px solid rgba(26,83,92,0.10)',
                transform: 'rotate(2deg)',
              }}
            >
              <GevelMockup width={240} className="block w-full h-auto" />
            </motion.div>
          </motion.div>

          {/* RIGHT — the letter */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow */}
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
                Brief van de maker
              </span>
            </div>

            <h2
              className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2.5px] leading-[0.95] mb-8"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)', color: '#1A535C' }}
            >
              <span className="block">Familiebedrijf<span style={{ color: '#F15025' }}>.</span></span>
              <span className="block" style={{ color: '#6B6B66' }}>
                45 jaar <SerifItalic style={{ letterSpacing: '-2px' }}>vak</SerifItalic>
                <span style={{ color: '#F15025' }}>.</span>
              </span>
              <span className="block">Eén maker<span style={{ color: '#F15025' }}>.</span></span>
            </h2>

            {/* Pull quote */}
            <p
              className="text-[20px] md:text-[24px] leading-[1.35] tracking-[-0.3px] mb-9 pl-5"
              style={{
                color: '#1A1A1A',
                borderLeft: '3px solid #F15025',
                fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              "Wij maken dingen. Dat is wat we doen."
            </p>

            {/* Body — brief van Antony */}
            <div
              className="space-y-5 text-[16px] md:text-[17px] leading-[1.7] max-w-xl"
              style={{ color: '#3F3F3A' }}
            >
              <p>
                <span
                  className="float-left font-heading font-bold mr-3 mt-1"
                  style={{
                    fontSize: '64px',
                    lineHeight: '0.85',
                    color: '#1A535C',
                  }}
                >
                  I
                </span>
                k ben <strong style={{ color: '#1A1A1A' }}>Antony Bootsma</strong>. Wij zijn een familiebedrijf. Sign Company bestaat 45 jaar. Mijn vader heeft het opgebouwd, doet de montage nog steeds. Ik neem het over.
              </p>
              <p>
                En ik had geen zin om nog jaren te werken met software die niet past bij hoe wij werken.
              </p>
              <p>
                Op een gegeven moment telde ik op een vrijdagmiddag vijf open tabbladen, drie WhatsApp-gesprekken en een post-it die ik niet meer kon lezen. Mijn vader belde voor de werkbon. Een klant wachtte op een bevestiging. En ik stond nog midden in een offerte.
              </p>
            </div>

            {/* Mid pull quote — visueel ankerpunt halverwege de brief */}
            <div
              className="my-10 md:my-12 py-6 pl-6 max-w-xl"
              style={{ borderLeft: '3px solid rgba(26,83,92,0.25)' }}
            >
              <p
                className="text-[22px] md:text-[26px] leading-[1.25] tracking-[-0.4px]"
                style={{
                  color: '#1A535C',
                  fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                Niet omdat ik het niet kon<span style={{ color: '#F15025' }}>.</span> Maar omdat het systeem het me niet makkelijk maakte<span style={{ color: '#F15025' }}>.</span>
              </p>
            </div>

            <div
              className="space-y-5 text-[16px] md:text-[17px] leading-[1.7] max-w-xl"
              style={{ color: '#3F3F3A' }}
            >
              <p>
                Ik zocht software die paste bij 45 jaar vakmanschap en de manier waarop wij werken. Die er niet was. Dus heb ik het zelf gebouwd, in de avonden, tussen de werkdagen door. Niet vanuit een glazen kantoor, maar vanuit dezelfde werkplaats waar mijn vader elke ochtend binnenloopt.
              </p>
              <p>
                Een van de dingen waar ik het meest trots op ben is het <strong style={{ color: '#1A1A1A' }}>klantportaal</strong>. Geen mailtjes heen en weer. Je klant krijgt één link, ziet de tekeningen, keurt de offerte goed. Dat scheelt ons elke week uren.
              </p>
              <p>
                En AI? Ik vind het geen toverwoord. Ik vind het een{' '}
                <span
                  style={{
                    fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                    fontStyle: 'italic',
                    color: '#1A1A1A',
                  }}
                >
                  werkwoord
                </span>
                . Onze assistent Daan schrijft offerteteksten, vat mails samen, rekent vierkante meters uit. Niet omdat het indrukwekkend klinkt, maar omdat het gewoon werkt.
              </p>
              <p>
                Ik noemde het <strong style={{ color: '#1A1A1A' }}>doen.</strong> Omdat dat is wat wij doen.
              </p>
              <p>
                Andere signmakers herkenden hetzelfde. Die losse eindjes, de administratie die het echte werk in de weg zit. Ik wilde dit niet voor mezelf houden. <strong style={{ color: '#1A1A1A' }}>doen.</strong> is gebouwd voor ons vak. Ik deel het graag met iedereen die er beter van wordt.
              </p>
            </div>

            {/* Closing tagline — stamp */}
            <p
              className="mt-8 max-w-xl text-[20px] md:text-[24px] leading-[1.3] tracking-[-0.3px]"
              style={{
                color: '#1A535C',
                fontFamily: '"Instrument Serif", var(--font-instrument-serif), Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              Voor het vak<span style={{ color: '#F15025' }}>.</span> Door het vak<span style={{ color: '#F15025' }}>.</span> Gewoon doen<span style={{ color: '#F15025' }}>.</span>
            </p>

            {/* Signature — stroke-drawn on view */}
            <div
              className="flex items-end justify-between mt-10 pt-7 max-w-xl"
              style={{ borderTop: '1px solid rgba(26,83,92,0.15)' }}
            >
              <div>
                <svg
                  width="160"
                  height="56"
                  viewBox="0 0 160 56"
                  className="mb-1"
                  aria-hidden
                >
                  <motion.path
                    d="M 8 36 C 18 18, 28 48, 40 30 C 50 14, 58 44, 70 28 C 82 14, 90 42, 102 26 C 114 14, 122 38, 134 24 C 146 14, 154 32, 150 18"
                    stroke="#1A535C"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.8, delay: 0.6, ease: 'easeInOut' }}
                  />
                </svg>
                <p
                  className="font-mono text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#6B6B66' }}
                >
                  Antony Bootsma · maker van doen.
                </p>
              </div>
              <a
                href="mailto:info@signcompany.nl"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-70 group"
                style={{ color: '#F15025' }}
              >
                <span className="relative">
                  Schrijf me
                  <span
                    className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                    style={{ backgroundColor: '#F15025' }}
                  />
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
