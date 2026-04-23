'use client'

import { motion, useMotionValue, useTransform, useSpring, useScroll, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import WachtlijstForm from '../WachtlijstForm'

const FLOW = [
  { label: 'Klant', color: '#3A6B8C' },
  { label: 'Project', color: '#1A535C' },
  { label: 'Offerte', color: '#F15025' },
  { label: 'Portaal', color: '#6A5A8A' },
  { label: 'Werkbon', color: '#9A5A48' },
  { label: 'Planning', color: '#1A535C' },
  { label: 'Factuur', color: '#2D6B48' },
  { label: 'Gedaan', color: '#F15025' },
]

// Scramble text effect
function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [display, setDisplay] = useState('')
  const [started, setStarted] = useState(false)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimeout)
  }, [delay])

  useEffect(() => {
    if (!started) return
    let iteration = 0
    const interval = setInterval(() => {
      setDisplay(
        text.split('').map((char, i) => {
          if (char === ' ' || char === '.') return char
          if (i < iteration) return text[i]
          return chars[Math.floor(Math.random() * chars.length)]
        }).join('')
      )
      iteration += 0.5
      if (iteration >= text.length) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [started, text])

  if (!started) return <span className="opacity-0">{text}</span>
  return <>{display || text}</>
}

// Floating particles
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => {
        const size = Math.random() * 3 + 1
        const x = Math.random() * 100
        const y = Math.random() * 100
        const duration = Math.random() * 20 + 15
        const delay = Math.random() * 10
        const isFlame = i % 7 === 0

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${x}%`,
              top: `${y}%`,
              backgroundColor: isFlame ? '#F15025' : 'white',
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0, isFlame ? 0.3 : 0.15, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}

// Animated flow with running highlight
function FlowSteps() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % FLOW.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center flex-wrap gap-1.5 md:gap-0">
      {FLOW.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <motion.span
            className="text-[12px] md:text-[13px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-500"
            animate={{
              backgroundColor: i === active ? `${step.color}25` : 'rgba(255,255,255,0.03)',
              color: i === active ? step.color : 'rgba(255,255,255,0.3)',
              scale: i === active ? 1.08 : 1,
            }}
            style={{ fontWeight: i === active || i === FLOW.length - 1 ? 700 : 500 }}
          >
            {step.label}<span style={{ color: '#F15025', opacity: i === active ? 1 : 0.3 }}>.</span>
          </motion.span>
          {i < FLOW.length - 1 && (
            <motion.svg
              width="20" height="8" viewBox="0 0 20 8" fill="none"
              className="mx-0.5 hidden md:block"
              animate={{ opacity: i === active ? 0.4 : 0.08 }}
              transition={{ duration: 0.3 }}
            >
              <path d="M0 4h16M14 1l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </div>
      ))}
    </div>
  )
}

// Counter that counts up
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0
      const duration = 2000
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * value))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, 1500)
    return () => clearTimeout(timer)
  }, [value])

  return <>{count}{suffix}</>
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -60])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!sectionRef.current) return
    const rect = sectionRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [mouseX, mouseY])

  const gradientX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), { stiffness: 50, damping: 30 })
  const gradientY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-15, 15]), { stiffness: 50, damping: 30 })

  return (
    <section
      id="hero-section"
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[100vh] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(170deg, #0F3A42 0%, #1A535C 35%, #1F6068 65%, #1A535C 100%)' }}
    >
      {/* Mouse-following gradient orb */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          x: gradientX,
          y: gradientY,
          left: '50%',
          top: '50%',
          marginLeft: -400,
          marginTop: -400,
          background: 'radial-gradient(circle, rgba(241,80,37,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Floating particles */}
      <Particles />

      {/* Abstract forms with parallax */}
      <motion.div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ y: backgroundY }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 0.06, scale: 1, rotate: 0 }}
          transition={{ duration: 2, delay: 0.3 }}
          className="absolute -top-20 -right-20 w-[600px] h-[600px]"
        >
          <svg viewBox="0 0 600 600" fill="none">
            <path d="M 480 300 A 180 180 0 1 0 300 480" stroke="white" strokeWidth="40" strokeLinecap="round" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }}
          transition={{ duration: 2, delay: 0.6 }}
          className="absolute bottom-10 -left-20 w-[400px] h-[400px]"
        >
          <svg viewBox="0 0 400 400" fill="none">
            <path d="M 50 200 A 150 150 0 0 1 350 200" stroke="white" strokeWidth="30" strokeLinecap="round" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Spectrum bar bottom */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 left-0 right-0 h-1 origin-left z-20"
        style={{ background: 'linear-gradient(90deg, #1A535C, #3A6B8C, #6A5A8A, #9A5A48, #F15025)' }}
      />

      {/* Content with scroll parallax */}
      <motion.div
        className="container-site relative z-10 pt-32 pb-28 md:pt-40 md:pb-36"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <div className="max-w-3xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#F15025' }} />
            <span className="text-[12px] font-medium text-white/50">Binnenkort live. Schrijf je in voor early access.</span>
          </motion.div>

          {/* Headline with scramble */}
          <h1 className="font-heading text-[48px] md:text-[72px] lg:text-[88px] font-bold tracking-[-4px] leading-[0.90] text-white mb-7">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <ScrambleText text="Jij maakt het" delay={300} /><span style={{ color: '#F15025' }}>.</span>
            </motion.span>
            <motion.span
              className="block text-white/25"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              doen<span style={{ color: '#F15025' }}>.</span> regelt de rest<span style={{ color: '#F15025' }}>.</span>
            </motion.span>
          </h1>

          {/* Subline */}
          <motion.p
            className="text-[18px] md:text-[21px] text-white/40 max-w-xl mx-auto leading-relaxed mb-10"
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            Alles-in-een voor <strong className="text-white/60">signmakers</strong> en creatieve maakbedrijven. Van eerste klantvraag tot oplevering.
          </motion.p>

          {/* Stats bar */}
          <motion.div
            className="flex items-center justify-center gap-8 md:gap-12 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            {[
              { value: 10, suffix: '', label: 'modules' },
              { value: 1, suffix: '', label: 'systeem' },
              { value: 0, suffix: '', label: 'gedoe' },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center">
                <p className="font-heading text-[28px] md:text-[36px] font-bold text-white tracking-tight leading-none">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[11px] text-white/25 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Signup */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md mx-auto"
          >
            <WachtlijstForm />
            <p className="text-[12px] text-white/20 mt-3">
              Eerste 30 dagen gratis. Geen creditcard nodig.
            </p>
          </motion.div>

          {/* Flow steps with running highlight */}
          <motion.div
            className="mt-16 md:mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <FlowSteps />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
