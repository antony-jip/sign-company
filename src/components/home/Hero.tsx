'use client'

import { motion } from 'framer-motion'
import { useRef } from 'react'
import WachtlijstForm from '../WachtlijstForm'
import {
  Users, FolderKanban, FileText, Globe, ClipboardCheck, Calendar, Receipt, CheckCircle,
} from 'lucide-react'

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

const FLOW_STEPS = [
  { icon: Users, label: 'Klant', color: '#3A6B8C' },
  { icon: FolderKanban, label: 'Project', color: '#1A535C' },
  { icon: FileText, label: 'Offerte', color: '#F15025' },
  { icon: Globe, label: 'Portaal', color: '#6A5A8A' },
  { icon: ClipboardCheck, label: 'Werkbon', color: '#9A5A48' },
  { icon: Calendar, label: 'Planning', color: '#1A535C' },
  { icon: Receipt, label: 'Factuur', color: '#2D6B48' },
  { icon: CheckCircle, label: 'Gedaan', color: '#F15025' },
]

export default function Hero() {
  const sectionRef = useRef(null)

  return (
    <section
      id="hero-section"
      ref={sectionRef}
      className="relative min-h-[100vh] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(170deg, #0F3A42 0%, #1A535C 35%, #1F6068 65%, #1A535C 100%)' }}
    >
      {/* ── Abstract Forms: arcs, dots, lines ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large arc (the "d" bowl) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.06, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px]"
        >
          <svg viewBox="0 0 500 500" fill="none">
            <path d="M 400 250 A 150 150 0 1 0 250 400" stroke="white" strokeWidth="40" strokeLinecap="round" />
          </svg>
        </motion.div>

        {/* Smaller arc */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }}
          transition={{ duration: 1.5, delay: 0.6 }}
          className="absolute bottom-20 -left-10 w-[300px] h-[300px]"
        >
          <svg viewBox="0 0 300 300" fill="none">
            <path d="M 50 150 A 100 100 0 0 1 250 150" stroke="white" strokeWidth="30" strokeLinecap="round" />
          </svg>
        </motion.div>

        {/* Dot grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="absolute top-[15%] right-[8%]"
        >
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: i === 4 || i === 12 || i === 24 ? '#F15025' : 'white',
                  opacity: i === 4 || i === 12 || i === 24 ? 0.5 : 0.3,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Corner element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-[15%] right-[5%]"
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <rect x="0" y="0" width="120" height="16" rx="8" fill="white" />
            <rect x="104" y="0" width="16" height="120" rx="8" fill="white" />
            <circle cx="110" cy="6" r="8" fill="#F15025" opacity="0.8" />
          </svg>
        </motion.div>

        {/* Spectrum bar bottom */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 right-0 h-1.5 origin-left"
          style={{ background: 'linear-gradient(90deg, #1A535C, #3A6B8C, #6A5A8A, #9A5A48, #F15025)' }}
        />

        {/* Pulsing flame dot */}
        <div className="absolute top-[25%] right-[20%] w-20 h-20 rounded-full animate-pulse" style={{ backgroundColor: '#F15025', opacity: 0.08 }} />
      </div>

      {/* ── Content ── */}
      <div className="container-site relative z-10 pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="flex flex-col lg:flex-row items-start gap-16 lg:gap-20">

          {/* Left: Text */}
          <div className="flex-1 max-w-2xl">
            <motion.h1
              className="font-heading text-[48px] md:text-[64px] lg:text-[72px] font-bold tracking-[-3px] leading-[0.95] text-white mb-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Geen rompslomp<span className="text-flame">.</span><br />
              <span className="text-white/40">Gewoon</span> doen<span className="text-flame">.</span>
            </motion.h1>

            <motion.p
              className="text-[18px] md:text-[20px] text-white/50 max-w-lg leading-relaxed mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              Alles-in-één software voor <strong className="text-white/70">signmakers</strong> en creatieve maakbedrijven. Van offerte tot factuur, van werkbon tot klantportaal.
            </motion.p>

            <motion.p
              className="text-[15px] text-white/30 max-w-md leading-relaxed mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Geen kwijtgeraakte mails meer. Geen losse Excel sheets. Je klant ziet alles overzichtelijk in het portaal. Jij houdt de regie.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <WachtlijstForm />
              <p className="text-xs text-white/25 mt-3">
                Eerste 30 dagen gratis. Geen creditcard nodig.
              </p>
            </motion.div>
          </div>

          {/* Right: Circular flow */}
          <motion.div
            className="flex-shrink-0 hidden lg:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative w-[380px] h-[380px]">
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className="font-heading text-[28px] font-bold text-white tracking-tight">
                  doen<span className="text-flame">.</span>
                </span>
                <span className="text-[11px] text-white/30 mt-0.5">slim gedaan.</span>
                {/* Powered by Claude badge */}
                <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <svg width="14" height="14" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M109.5 20.3C104.1 7.2 96.7 0 90 0C83.3 0 75.9 7.2 70.5 20.3C65.4 32.7 62 50.3 62 70.3V109.7C62 129.7 65.4 147.3 70.5 159.7C75.9 172.8 83.3 180 90 180C96.7 180 104.1 172.8 109.5 159.7C114.6 147.3 118 129.7 118 109.7V70.3C118 50.3 114.6 32.7 109.5 20.3Z" fill="#D4A27C" />
                    <path d="M159.7 109.5C172.8 104.1 180 96.7 180 90C180 83.3 172.8 75.9 159.7 70.5C147.3 65.4 129.7 62 109.7 62H70.3C50.3 62 32.7 65.4 20.3 70.5C7.2 75.9 0 83.3 0 90C0 96.7 7.2 104.1 20.3 109.5C32.7 114.6 50.3 118 70.3 118H109.7C129.7 118 147.3 114.6 159.7 109.5Z" fill="#D4A27C" />
                  </svg>
                  <span className="text-[9px] font-medium text-white/35 tracking-wide">AI by Claude</span>
                </div>
              </div>

              {/* Circular ring */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 380">
                <circle cx="190" cy="190" r="150" fill="none" stroke="white" strokeWidth="1" opacity="0.08" />
                {/* Gradient arc showing progress */}
                <defs>
                  <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3A6B8C" />
                    <stop offset="30%" stopColor="#1A535C" />
                    <stop offset="60%" stopColor="#6A5A8A" />
                    <stop offset="100%" stopColor="#F15025" />
                  </linearGradient>
                </defs>
                <motion.circle
                  cx="190" cy="190" r="150"
                  fill="none"
                  stroke="url(#spectrumGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 150}`}
                  strokeDashoffset={`${2 * Math.PI * 150}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 150 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 150 * 0.05 }}
                  transition={{ duration: 2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  transform="rotate(-90 190 190)"
                  opacity="0.6"
                />
              </svg>

              {/* Step icons around the circle */}
              {FLOW_STEPS.map((step, idx) => {
                const angle = (idx / FLOW_STEPS.length) * 2 * Math.PI - Math.PI / 2
                const radius = 150
                const cx = 190 + radius * Math.cos(angle)
                const cy = 190 + radius * Math.sin(angle)
                const StepIcon = step.icon
                const isHighlight = idx === 0 || idx === FLOW_STEPS.length - 1

                return (
                  <motion.div
                    key={step.label}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: cx - (isHighlight ? 24 : 20),
                      top: cy - (isHighlight ? 24 : 20),
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...spring, delay: 0.8 + idx * 0.1 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        width: isHighlight ? 48 : 40,
                        height: isHighlight ? 48 : 40,
                        backgroundColor: step.color,
                        boxShadow: `0 4px 20px ${step.color}50`,
                      }}
                    >
                      <StepIcon className="text-white" style={{ width: isHighlight ? 22 : 18, height: isHighlight ? 22 : 18 }} />
                    </div>
                    <span className="text-[10px] font-bold text-white/70 mt-1.5 whitespace-nowrap">{step.label}</span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Smooth gradient fade to page bg */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent, #F5F4F1)' }} />

      {/* ── Ticker ── */}
      <div className="absolute bottom-6 left-0 right-0 overflow-hidden marquee-fade z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="flex animate-marquee whitespace-nowrap py-2"
        >
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex items-center">
              {[
                'offerte verstuurd',
                'factuur betaald',
                'project opgeleverd',
                'montage gepland',
                'werkbon getekend',
                'klant akkoord',
                'portaal gedeeld',
                'planning klaar',
              ].map((item, i) => (
                <span
                  key={`${setIndex}-${i}`}
                  className="font-mono text-xs text-white/15 mx-6 whitespace-nowrap"
                >
                  {item}<span className="text-flame/30">.</span>
                  <span className="mx-4 text-white/10">&#10022;</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
