'use client'

import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Calendar, Briefcase, Receipt } from 'lucide-react'

/**
 * Live workflow simulation — the FRONT card cycles through the real doen.
 * project lifecycle, smoothly morphing between stages every 3.4 seconds:
 *
 *   01 PROJECT (purple, in productie)
 *      ↓
 *   02 OFFERTE (flame, verstuurd)
 *      ↓ akkoord-stamp bounces in
 *   03 WERKBON (clay, getekend)
 *      ↓ signature draws
 *   04 FACTUUR (green, betaald)
 *      ↓ check + counter
 *   → loop
 *
 * Background cards stay as decoration. Full 3D cursor-tilt on the stack.
 */

type StageId = 'project' | 'offerte' | 'werkbon' | 'factuur'

interface Stage {
  id: StageId
  status: string
  statusColor: string
  statusBg: string
  title: string
  client: string
  ref: string
  amount: string
  meta: string
  metaIcon: React.ReactNode
  showAkkoord?: boolean
  showSig?: boolean
  showBetaald?: boolean
}

const STAGES: Stage[] = [
  {
    id: 'project',
    status: 'In productie',
    statusColor: '#5A4A78',
    statusBg: '#5A4A7815',
    title: 'Gevelreclame Hoofdstraat',
    client: 'Bakker Reclame B.V.',
    ref: 'PR-0142',
    amount: '€4.250',
    meta: '3 jul',
    metaIcon: <Briefcase className="w-3 h-3" strokeWidth={2} />,
  },
  {
    id: 'offerte',
    status: 'Offerte · verstuurd',
    statusColor: '#F15025',
    statusBg: '#F1502515',
    title: 'Lichtreclame VW Garage',
    client: 'VW Garage Mosselman',
    ref: 'OFF-0089',
    amount: '€2.180',
    meta: '2 dagen geleden',
    metaIcon: <FileText className="w-3 h-3" strokeWidth={2} />,
    showAkkoord: true,
  },
  {
    id: 'werkbon',
    status: 'Werkbon · getekend',
    statusColor: '#9A5A48',
    statusBg: '#9A5A4815',
    title: 'Autobelettering Transport',
    client: 'Jansen Logistiek B.V.',
    ref: 'WB-0061',
    amount: '€890',
    meta: 'op locatie',
    metaIcon: <Calendar className="w-3 h-3" strokeWidth={2} />,
    showSig: true,
  },
  {
    id: 'factuur',
    status: 'Betaald',
    statusColor: '#2D6B48',
    statusBg: '#2D6B4815',
    title: 'Smit Signs & Wrapping',
    client: 'iDEAL betaling ontvangen',
    ref: 'FACT-0211',
    amount: '€1.245',
    meta: 'vandaag',
    metaIcon: <Receipt className="w-3 h-3" strokeWidth={2} />,
    showBetaald: true,
  },
]

export default function HeroAppPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const [stageIdx, setStageIdx] = useState(0)

  // Auto-cycle every 3.4s — respects prefers-reduced-motion
  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return
    const id = setInterval(() => setStageIdx((p) => (p + 1) % STAGES.length), 3400)
    return () => clearInterval(id)
  }, [])

  const stage = STAGES[stageIdx]

  // Cursor tilt
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 120, damping: 18 })
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 18 })

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  function onLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative w-full"
      style={{ perspective: 1400 }}
    >
      <motion.div
        className="relative aspect-[4/5] w-full"
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      >
        {/* Sand backdrop blob */}
        <div
          aria-hidden
          className="absolute inset-6 rounded-full pointer-events-none"
          style={{
            backgroundColor: '#E8E1D0',
            opacity: 0.55,
            filter: 'blur(40px)',
            transform: 'translateZ(-40px)',
          }}
        />

        {/* GHOST CARD 2 — back-left */}
        <motion.div
          className="absolute"
          style={{
            top: '6%',
            left: '-3%',
            width: '62%',
            transform: 'rotate(-7deg) translateZ(20px)',
          }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <GhostCard accent="#2D6B48" label="Betaald" amount="€1.245" />
        </motion.div>

        {/* GHOST CARD 3 — back-right */}
        <motion.div
          className="absolute"
          style={{
            top: '3%',
            right: '-3%',
            width: '60%',
            transform: 'rotate(6deg) translateZ(40px)',
          }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          <GhostCard accent="#F15025" label="Offerte" amount="€2.180" />
        </motion.div>

        {/* FRONT CARD — workflow simulator */}
        <motion.div
          className="absolute"
          style={{
            top: '30%',
            left: '8%',
            width: '80%',
            transform: 'rotate(-2deg) translateZ(80px)',
          }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <WorkflowCard stage={stage} />
        </motion.div>

        {/* Stage indicator — bottom-right */}
        <div
          className="absolute"
          style={{ bottom: '-2%', right: '4%', transform: 'translateZ(100px)' }}
        >
          <StageIndicator current={stageIdx} total={STAGES.length} />
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   GHOST CARD — decoration in the back
   ───────────────────────────────────────────────────────────────── */
function GhostCard({ accent, label, amount }: { accent: string; label: string; amount: string }) {
  return (
    <div
      className="rounded-[10px] overflow-hidden bg-white"
      style={{
        boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 40px -16px rgba(20,40,40,0.18)',
        border: '1px solid rgba(26,83,92,0.08)',
      }}
    >
      <div className="h-1" style={{ backgroundColor: accent }} />
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
          <span
            className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase"
            style={{ color: accent }}
          >
            {label}
          </span>
        </div>
        <div className="h-2 w-3/4 rounded-sm mb-2" style={{ backgroundColor: '#F0EDE5' }} />
        <div className="h-2 w-1/2 rounded-sm mb-3" style={{ backgroundColor: '#F0EDE5' }} />
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-12 rounded-sm" style={{ backgroundColor: '#F0EDE5' }} />
          <span
            className="font-heading font-bold text-[12px] tabular-nums"
            style={{ color: accent }}
          >
            {amount}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   STAGE INDICATOR — 4 dots tracking the loop
   ───────────────────────────────────────────────────────────────── */
function StageIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white"
      style={{
        boxShadow: '0 4px 14px -4px rgba(20,40,40,0.2)',
        border: '1px solid rgba(26,83,92,0.08)',
      }}
    >
      <span
        className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase"
        style={{ color: '#6B6B66' }}
      >
        Live demo
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === current ? 16 : 4,
              height: 4,
              backgroundColor: i === current ? '#F15025' : '#E0DDD5',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   WORKFLOW CARD — front, morphs through stages
   ───────────────────────────────────────────────────────────────── */
function WorkflowCard({ stage }: { stage: Stage }) {
  return (
    <div
      className="relative rounded-[10px] overflow-hidden bg-white"
      style={{
        boxShadow:
          '0 1px 2px rgba(20,40,40,0.04), 0 12px 28px -12px rgba(20,40,40,0.18), 0 30px 60px -24px rgba(20,40,40,0.22)',
        border: '1px solid rgba(26,83,92,0.08)',
      }}
    >
      {/* Top stripe — morphs color */}
      <motion.div
        className="h-1"
        animate={{ backgroundColor: stage.statusColor }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="p-5 relative">
        {/* Status row */}
        <div className="flex items-center justify-between mb-3 min-h-[24px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id + '-status'}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
              style={{ backgroundColor: stage.statusBg }}
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: stage.statusColor }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span
                className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase"
                style={{ color: stage.statusColor }}
              >
                {stage.status}
              </span>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.span
              key={stage.id + '-ref'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-[10px] tracking-[0.1em]"
              style={{ color: '#6B6B66' }}
            >
              {stage.ref}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Title + client */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id + '-title'}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.4 }}
          >
            <h3
              className="font-heading text-[18px] font-bold leading-[1.15] mb-1"
              style={{ color: '#1A535C', letterSpacing: '-0.5px' }}
            >
              {stage.title}
            </h3>
            <p className="text-[12px] mb-4" style={{ color: '#6B6B66' }}>
              {stage.client}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Mini blueprint with conditional overlays */}
        <div
          className="relative h-24 rounded-[6px] overflow-hidden mb-4"
          style={{ backgroundColor: '#F8F6F0', border: '1px solid #E8E5DE' }}
        >
          <svg viewBox="0 0 200 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="hap-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#1A535C" strokeWidth={0.25} opacity={0.18} />
              </pattern>
            </defs>
            <rect width="200" height="96" fill="url(#hap-grid)" />
            <rect x="40" y="28" width="120" height="44" fill="none" stroke="#1A535C" strokeWidth="1" />
            <line x1="36" y1="20" x2="164" y2="20" stroke="#F15025" strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1="36" y1="17" x2="36" y2="23" stroke="#F15025" strokeWidth="0.6" />
            <line x1="164" y1="17" x2="164" y2="23" stroke="#F15025" strokeWidth="0.6" />
            <text x="100" y="17" textAnchor="middle" fill="#F15025" fontSize="5.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.5">
              2400 MM
            </text>
            <text x="100" y="52" textAnchor="middle" fill="#1A535C" fontSize="9" fontWeight="700" fontFamily="IBM Plex Sans, sans-serif" opacity="0.55">
              BAKKER RECLAME
            </text>

            {/* AKKOORD stamp on offerte */}
            <AnimatePresence>
              {stage.showAkkoord && (
                <motion.g
                  initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
                  animate={{ opacity: 1, scale: 1, rotate: -14 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: 0.25,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                  style={{ transformOrigin: '155px 75px' }}
                >
                  <rect x="125" y="62" width="60" height="22" rx="2" fill="none" stroke="#F15025" strokeWidth="1.5" />
                  <text x="155" y="76" textAnchor="middle" fill="#F15025" fontSize="9" fontWeight="800" fontFamily="IBM Plex Sans, sans-serif" letterSpacing="1">
                    AKKOORD
                  </text>
                </motion.g>
              )}
            </AnimatePresence>

            {/* Signature on werkbon */}
            <AnimatePresence>
              {stage.showSig && (
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.2 }}
                  d="M 50 78 C 60 72, 70 84, 82 76 S 100 70, 112 80 S 130 74, 140 78"
                  stroke="#9A5A48"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                />
              )}
            </AnimatePresence>

            {/* Betaald check on factuur */}
            <AnimatePresence>
              {stage.showBetaald && (
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                  style={{ transformOrigin: '100px 50px' }}
                >
                  <circle cx="100" cy="50" r="14" fill="#2D6B48" />
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.4 }}
                    d="M 93 50 L 99 56 L 108 46"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between min-h-[24px]">
          <div className="flex -space-x-1.5">
            <div
              className="w-6 h-6 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: '#1A535C' }}
            >
              MV
            </div>
            <div
              className="w-6 h-6 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: '#5A4A78' }}
            >
              JK
            </div>
            <div
              className="w-6 h-6 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center"
              style={{ backgroundColor: '#F8F6F0', color: '#1A535C' }}
            >
              +2
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id + '-amount'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-3"
            >
              <span
                className="font-mono text-[10px] tracking-[0.1em] uppercase tabular-nums"
                style={{ color: '#6B6B66' }}
              >
                {stage.meta}
              </span>
              <span
                className="font-heading font-bold text-[16px] tabular-nums"
                style={{ color: stage.statusColor }}
              >
                {stage.amount}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
