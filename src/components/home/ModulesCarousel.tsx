'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const modules = [
  { label: 'Projecten', sub: 'Alles in één cockpit', href: '/features/projecten', color: '#1A535C', image: '/images/modules/projecten.jpg' },
  { label: 'Offertes', sub: 'Professioneel in minuten', href: '/features/offertes', color: '#F15025', image: '/images/modules/offertes.jpg' },
  { label: 'Klantportaal', sub: 'Deel, bespreek, accordeer', href: '/features/portaal', color: '#6A5A8A', image: '/images/modules/klantportaal.jpg' },
  { label: 'Planning', sub: 'Sleep je week in elkaar', href: '/features/planning', color: '#9A5A48', image: '/images/modules/planning.jpg' },
  { label: 'Werkbonnen', sub: 'Digitaal op locatie', href: '/features/werkbonnen', color: '#1A535C', image: '/images/modules/werkbonnen.jpg' },
  { label: 'Facturen', sub: 'Verstuurd, herinnerd, betaald', href: '/features/facturen', color: '#2D6B48', image: '/images/modules/facturen.jpg' },
  { label: 'Visualizer', sub: 'AI toont het eindresultaat', href: '/features/visualizer', color: '#9A5A48', image: '/images/modules/visualizer.jpg' },
  { label: 'AI-assistent', sub: 'Je slimste collega', href: '/features/ai', color: '#1A535C', image: '/images/modules/ai-assistant.jpg' },
]

export default function ModulesCarousel() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section className="py-20 md:py-28" ref={ref}>
      <div className="container-site">
        <motion.div
          className="flex items-end justify-between mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] leading-[1.1]">
            Ontdek de modules<span className="text-flame">.</span>
          </h2>
          <Link href="/features" className="hidden md:flex items-center gap-1.5 text-[13px] font-semibold text-petrol hover:text-flame transition-colors">
            Bekijk alles <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={mod.href} className="group block">
                <div className="rounded-2xl overflow-hidden bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgba(26,83,92,0.08)]">
                  {/* Accent top line */}
                  <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${mod.color}40, transparent)` }} />

                  {/* Illustration */}
                  <div className="px-8 pt-6 pb-2 flex items-center justify-center">
                    <Image
                      src={mod.image}
                      alt={mod.label}
                      width={1000}
                      height={1000}
                      className="w-[75%] h-auto transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Label */}
                  <div className="px-5 pb-5">
                    <h3 className="text-[16px] font-bold tracking-tight mb-0.5" style={{ color: '#1A1A1A' }}>
                      {mod.label}<span style={{ color: mod.color }}>.</span>
                    </h3>
                    <p className="text-[12px]" style={{ color: '#9B9B95' }}>
                      {mod.sub}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
