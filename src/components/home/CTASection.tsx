'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import WachtlijstForm from '../WachtlijstForm'

export default function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="wachtlijst" className="relative overflow-hidden" ref={ref}>
      <div style={{ backgroundColor: '#0F3A42' }}>
        <div className="container-site py-24 md:py-32">
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-heading text-[36px] md:text-[52px] font-bold text-white tracking-[-2.5px] leading-[0.95] mb-5">
                Binnenkort live<span className="text-flame">.</span>
              </h2>
              <p className="text-[17px] md:text-[19px] text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
                Schrijf je in en wij laten je weten zodra doen. klaar is. Als eerste erbij.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex justify-center">
                <WachtlijstForm />
              </div>
              <p className="text-[12px] text-white/20 mt-4">
                Geen spam. Alleen een mail als we live gaan.
              </p>
            </motion.div>
          </div>

          {/* Decorative arcs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              className="absolute -bottom-32 -left-20 w-[400px] h-[400px]"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 0.04 } : {}}
              transition={{ duration: 1.5, delay: 0.5 }}
            >
              <svg viewBox="0 0 400 400" fill="none">
                <path d="M 300 200 A 100 100 0 1 0 200 300" stroke="white" strokeWidth="30" strokeLinecap="round" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute -top-20 -right-10 w-[250px] h-[250px]"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 0.03 } : {}}
              transition={{ duration: 1.5, delay: 0.8 }}
            >
              <svg viewBox="0 0 250 250" fill="none">
                <path d="M 50 125 A 75 75 0 0 1 200 125" stroke="white" strokeWidth="20" strokeLinecap="round" />
              </svg>
            </motion.div>
            {/* Flame dot */}
            <div className="absolute top-[30%] right-[15%] w-16 h-16 rounded-full animate-pulse" style={{ backgroundColor: '#F15025', opacity: 0.06 }} />
          </div>
        </div>
      </div>

      {/* Spectrum bar bottom */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #0F3A42, #1A535C, #F15025)' }} />
    </section>
  )
}
