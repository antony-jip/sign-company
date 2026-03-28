'use client'

import Image from 'next/image'
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion'
import { useRef, useCallback } from 'react'

export default function ProcesVisual() {
  const cardRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [3, -3]), { stiffness: 150, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-3, 3]), { stiffness: 150, damping: 20 })
  const glareX = useSpring(useTransform(mouseX, [0, 1], [0, 100]), { stiffness: 150, damping: 20 })
  const glareY = useSpring(useTransform(mouseY, [0, 1], [0, 100]), { stiffness: 150, damping: 20 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5)
    mouseY.set(0.5)
  }, [mouseX, mouseY])

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-white">
      <div className="container-site">
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#F15025' }}>
            Hoe het werkt
          </p>
          <h2 className="font-heading text-[28px] md:text-[40px] font-extrabold tracking-[-1.5px] leading-[1.05]" style={{ color: '#1A535C' }}>
            Eén project. Alles geregeld<span style={{ color: '#F15025' }}>.</span>
          </h2>
          <p className="text-[16px] md:text-[18px] mt-3 leading-relaxed" style={{ color: '#6B6B66' }}>
            Van klant tot oplevering — in één cockpit.
          </p>
        </motion.div>

        <motion.div
          ref={cardRef}
          className="max-w-[1200px] mx-auto rounded-2xl bg-white p-6 md:p-10 shadow-[0_4px_50px_rgba(26,83,92,0.09)] overflow-hidden relative"
          style={{
            rotateX,
            rotateY,
            transformPerspective: 1200,
            transformStyle: 'preserve-3d',
          }}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{
            shadow: '0 8px 60px rgba(26,83,92,0.10)',
          }}
        >
          {/* Subtle glare overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none z-10 rounded-2xl"
            style={{
              background: useTransform(
                [glareX, glareY],
                ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
              ),
            }}
          />

          <Image
            src="/images/proces-doen.webp"
            alt="Van klant tot oplevering — het doen. proces"
            width={1920}
            height={1080}
            className="w-full h-auto relative z-0"
            loading="lazy"
          />
        </motion.div>

        <motion.p
          className="text-center text-[15px] md:text-[16px] mt-10 md:mt-14 leading-relaxed"
          style={{ color: '#9B9B95' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Ontdek hieronder de modules<span style={{ color: '#F15025' }}>.</span>
        </motion.p>
      </div>
    </section>
  )
}
