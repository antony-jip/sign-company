'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/* Eén typografisch moment, geen cards. De volledige werkdag staat op /hoe-het-werkt. */
export default function Statement() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-120px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <section ref={ref} className="bg-white">
      <div className="container-site py-16 md:py-36">
        <motion.blockquote
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <p
            className="font-heading font-bold text-petrol leading-[1.08] mb-7"
            style={{ fontSize: 'clamp(28px, 3.8vw, 46px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Je hebt vast al iets voor offertes en facturen. Maar portaal, mail en
            opvolging, waar het werk echt gewonnen wordt, doe je er nu naast<span className="text-flame">.</span>
          </p>
          <Link
            href="/hoe-het-werkt"
            className="group inline-flex items-center gap-2 text-[15px] md:text-[16px] font-semibold text-ink"
          >
            <span className="relative">
              Zie een hele werkdag in doen.
              <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
            </span>
            <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </motion.blockquote>
      </div>
    </section>
  )
}
