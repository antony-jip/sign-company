'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'

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
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] leading-[1.1]">
            Ontdek de modules<span className="text-flame">.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.label}
              initial={{ opacity: 0, y: 25 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={mod.href} className="group block">
                <div
                  className="rounded-2xl overflow-hidden bg-white transition-all duration-400 group-hover:-translate-y-[3px]"
                  style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(100,80,40,0.03)' }}
                >
                  {/* Illustration */}
                  <div className="p-5 pb-3 flex items-center justify-center">
                    <Image
                      src={mod.image}
                      alt={mod.label}
                      width={1000}
                      height={1000}
                      className="w-[85%] h-auto transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>

                  {/* Label + sub */}
                  <div className="px-5 pb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mod.color }} />
                      <span className="text-[15px] font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
                        {mod.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-40 transition-opacity duration-300" style={{ color: mod.color }} />
                    </div>
                    <p className="text-[12px] pl-[18px]" style={{ color: '#9B9B95' }}>
                      {mod.sub}
                    </p>
                  </div>

                  {/* Accent bar */}
                  <div className="h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}20)` }} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
