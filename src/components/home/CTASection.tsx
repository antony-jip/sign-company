'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
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
              <p className="text-[13px] font-semibold mb-4 tracking-wide" style={{ color: '#F15025' }}>
                Binnenkort live
              </p>
              <h2 className="font-heading text-[36px] md:text-[52px] font-bold text-white tracking-[-2.5px] leading-[0.92] mb-5">
                Stop met rommelen<span style={{ color: '#F15025' }}>.</span><br />
                Begin met doen<span style={{ color: '#F15025' }}>.</span>
              </h2>
              <p className="text-[17px] md:text-[19px] text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
                Schrijf je in. We mailen je zodra doen. klaar is. Als eerste erbij.
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
                Eerste 30 dagen gratis. Geen creditcard nodig. Geen spam.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #0F3A42, #1A535C, #F15025)' }} />
    </section>
  )
}
