'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

const steps = [
  {
    label: 'Klant',
    desc: 'Nieuwe aanvraag. KVK lookup. Gegevens automatisch ingevuld.',
    color: '#3A6B8C',
    portaal: false,
    icon: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></>,
  },
  {
    label: 'Project',
    desc: 'Cockpit aanmaken. Situatiefoto\'s, taken, briefing.',
    color: '#1A535C',
    portaal: false,
    icon: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></>,
  },
  {
    label: 'Offerte',
    desc: 'Calculator met templates. Werktekening erbij. Verstuur samen via het portaal.',
    color: '#F15025',
    portaal: true,
    icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></>,
  },
  {
    label: 'Tekening',
    desc: 'Werktekening of situatieschets uploaden. Klant bekijkt en keurt goed via het portaal.',
    color: '#5A7A8A',
    portaal: true,
    icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  },
  {
    label: 'Werkbon',
    desc: 'Offerte-regels 1:1. Instructiefoto\'s voor de monteur.',
    color: '#9A5A48',
    portaal: false,
    icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
  },
  {
    label: 'Planning',
    desc: 'Sleep naar een dag. Per monteur. Weerbericht. Werkbon zit eraan vast.',
    color: '#1A535C',
    portaal: false,
    icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  },
  {
    label: 'Factuur',
    desc: 'Eén klik. Betaallink via Mollie. Automatische herinneringen.',
    color: '#2D6B48',
    portaal: true,
    icon: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
  },
  {
    label: 'Gedaan',
    desc: 'Opgeleverd. Klant tevreden. Alles gedocumenteerd.',
    color: '#F15025',
    portaal: false,
    icon: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01 9 11.01" /></>,
  },
]

const RADIUS = 162
const CENTER = 200

function StepIcon({ icon, color, isActive, size = 48 }: { icon: React.ReactNode; color: string; isActive: boolean; size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center transition-all duration-400"
      style={{
        width: size,
        height: size,
        backgroundColor: isActive ? color : '#F8F7F5',
        boxShadow: isActive ? `0 6px 20px ${color}35` : 'none',
      }}
    >
      <svg
        width={size * 0.45}
        height={size * 0.45}
        viewBox="0 0 24 24"
        fill="none"
        stroke={isActive ? 'white' : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
    </div>
  )
}

export default function ProcessFlow() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto || !inView) return
    const interval = setInterval(() => setActive(p => (p + 1) % steps.length), 3000)
    return () => clearInterval(interval)
  }, [auto, inView])

  function select(i: number) {
    setActive(i)
    setAuto(false)
  }

  const s = steps[active]

  const portalDesc: Record<number, string> = {
    2: 'Offerte wordt gedeeld via het portaal. Klant bekijkt, reageert en keurt goed met één klik.',
    3: 'Werktekening of situatieschets delen. Klant bekijkt, keurt goed of vraagt revisie aan.',
    6: 'Factuur met betaallink. Klant betaalt direct via iDEAL of creditcard.',
  }

  return (
    <section ref={ref} className="py-20 md:py-32 bg-white overflow-hidden">
      <div className="container-site">

        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#F15025' }}>
            Hoe het werkt
          </p>
          <h2 className="font-heading text-[32px] md:text-[48px] font-bold tracking-[-2px] leading-[0.95] mb-5" style={{ color: '#1A535C' }}>
            Van klant tot gedaan<span style={{ color: '#F15025' }}>.</span>
          </h2>
          <p className="text-[17px] max-w-md mx-auto leading-relaxed" style={{ color: '#6B6B66' }}>
            Eén flow. Alles verbonden. Je klant volgt mee via het portaal.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[390px_1fr] gap-10 lg:gap-16 items-center max-w-5xl mx-auto">

          {/* Left: Circle */}
          <div className="flex justify-center">
            <div className="relative" style={{ width: CENTER * 2, height: CENTER * 2 }}>

              {/* SVG rings and connections */}
              <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}>
                <defs>
                  <linearGradient id="flowGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1A535C" />
                    <stop offset="50%" stopColor="#6A5A8A" />
                    <stop offset="100%" stopColor="#F15025" />
                  </linearGradient>
                </defs>

                {/* Background ring */}
                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#EBEBEB" strokeWidth="1.5" />

                {/* Progress arc */}
                <motion.circle
                  cx={CENTER} cy={CENTER} r={RADIUS}
                  fill="none"
                  stroke="url(#flowGrad2)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * RADIUS}
                  animate={{ strokeDashoffset: 2 * Math.PI * RADIUS * (1 - (active + 1) / steps.length) }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />

                {/* Dashed lines from portaal steps to center */}
                {steps.map((step, i) => {
                  if (!step.portaal) return null
                  const angle = (i / steps.length) * 2 * Math.PI - Math.PI / 2
                  const x = CENTER + RADIUS * Math.cos(angle)
                  const y = CENTER + RADIUS * Math.sin(angle)
                  const isStepActive = i === active
                  return (
                    <motion.line
                      key={`conn-${i}`}
                      x1={x} y1={y} x2={CENTER} y2={CENTER}
                      stroke="#6A5A8A"
                      strokeWidth={isStepActive ? 1.5 : 1}
                      strokeDasharray="4 4"
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: isStepActive ? 0.4 : 0.12 } : {}}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                    />
                  )
                })}
              </svg>

              {/* Center: Portaal icon */}
              <motion.div
                className="absolute flex flex-col items-center justify-center"
                style={{ left: CENTER - 30, top: CENTER - 30, width: 60, height: 60 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div
                  className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: '#6A5A8A', boxShadow: '0 4px 20px rgba(106,90,138,0.3)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12l3 3 5-6" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold mt-1.5 whitespace-nowrap" style={{ color: '#6A5A8A' }}>
                  Portaal<span style={{ color: '#F15025' }}>.</span>
                </span>
              </motion.div>

              {/* Step nodes */}
              {steps.map((step, i) => {
                const angle = (i / steps.length) * 2 * Math.PI - Math.PI / 2
                const x = CENTER + RADIUS * Math.cos(angle)
                const y = CENTER + RADIUS * Math.sin(angle)
                const isActive = i === active

                return (
                  <motion.button
                    key={step.label}
                    className="absolute flex flex-col items-center"
                    style={{ left: x - 28, top: y - 32 }}
                    onClick={() => select(i)}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.07, type: 'spring', stiffness: 200, damping: 20 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="relative"
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <StepIcon icon={step.icon} color={step.color} isActive={isActive} size={52} />

                      {/* Portaal dot */}
                      {step.portaal && (
                        <div
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: '#6A5A8A', border: '2px solid white' }}
                        />
                      )}

                      {/* Active pulse */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          style={{ border: `2px solid ${step.color}` }}
                          initial={{ scale: 1, opacity: 0.4 }}
                          animate={{ scale: 1.35, opacity: 0 }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>

                    <span
                      className="text-[10px] font-bold mt-1.5 whitespace-nowrap transition-colors duration-300"
                      style={{ color: isActive ? step.color : '#9B9B95' }}
                    >
                      {step.label}<span style={{ color: '#F15025', opacity: isActive ? 1 : 0.3 }}>.</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Right: Detail */}
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Step badge */}
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[11px] font-bold tracking-wider" style={{ color: '#9B9B95' }}>
                STAP {String(active + 1).padStart(2, '0')}
              </span>
              {s.portaal && (
                <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#6A5A8A' }}>
                  VIA PORTAAL
                </span>
              )}
            </div>

            {/* Title with icon */}
            <div className="flex items-center gap-4 mb-5">
              <StepIcon icon={s.icon} color={s.color} isActive={true} size={56} />
              <h3 className="font-heading text-[32px] md:text-[40px] font-bold tracking-[-2px] leading-[0.95]" style={{ color: s.color }}>
                {s.label}<span style={{ color: '#F15025' }}>.</span>
              </h3>
            </div>

            {/* Description */}
            <p className="text-[17px] md:text-[18px] leading-[1.7] mb-6 max-w-md" style={{ color: '#6B6B66' }}>
              {s.desc}
            </p>

            {/* Portaal connection */}
            {s.portaal && portalDesc[active] && (
              <motion.div
                className="flex items-start gap-3 rounded-xl p-5 mb-6"
                style={{ backgroundColor: '#6A5A8A08', border: '1px solid #6A5A8A15' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: '#6A5A8A' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12l3 3 5-6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: '#6A5A8A' }}>
                    Klant ziet dit in het portaal
                  </p>
                  <p className="text-[13px] leading-[1.6] mt-0.5" style={{ color: '#6B6B66' }}>
                    {portalDesc[active]}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Dot navigation */}
            <div className="flex items-center gap-2">
              {steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => select(i)}
                  className="relative h-2 rounded-full transition-all duration-300"
                  style={{
                    width: i === active ? 24 : 8,
                    backgroundColor: i === active ? step.color : '#EBEBEB',
                  }}
                >
                  {step.portaal && i !== active && (
                    <div className="absolute -top-1 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#6A5A8A' }} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
